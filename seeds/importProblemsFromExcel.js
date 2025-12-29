const mongoose = require('mongoose');
const XLSX = require('xlsx');
const { PredefinedProblem } = require('../models/schemas');
const path = require('path');

// Connect to MongoDB
require('dotenv').config();
const dbUrl = process.env.DB_URL || 'mongodb://127.0.0.1:27017/yelp-camp';
mongoose.connect(dbUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', async () => {
  console.log('Database connected');
  
  try {
    // Get Excel file path from command line argument
    const excelFilePath = process.argv[2];
    
    if (!excelFilePath) {
      console.log('\n❌ Please provide the path to your Excel file');
      console.log('\nUsage: node seeds/importProblemsFromExcel.js <path-to-excel-file>');
      console.log('Example: node seeds/importProblemsFromExcel.js ./problem_statements.xlsx');
      console.log('\n📋 Expected Excel Format:');
      console.log('   Column A: SDG Goal (e.g., "No Poverty", "Zero Hunger", etc.)');
      console.log('   Column B: Problem Statement');
      console.log('   Column C: Recommended Stakeholders (comma-separated, optional)');
      console.log('\n   First row should be headers: SDG Goal | Problem Statement | Recommended Stakeholders\n');
      mongoose.connection.close();
      return;
    }

    // Check if file exists
    const fs = require('fs');
    if (!fs.existsSync(excelFilePath)) {
      console.error(`\n❌ File not found: ${excelFilePath}`);
      mongoose.connection.close();
      return;
    }

    console.log(`\n📖 Reading Excel file: ${excelFilePath}`);
    
    // Read Excel file
    const workbook = XLSX.readFile(excelFilePath);
    const sheetName = workbook.SheetNames[0]; // Use first sheet
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`\n📊 Found ${data.length} rows in Excel file`);

    if (data.length === 0) {
      console.log('❌ No data found in Excel file');
      mongoose.connection.close();
      return;
    }

    // Expected column names (case-insensitive matching)
    let sdgColumn, problemColumn;
    const headers = Object.keys(data[0]);
    
    // Find column names (flexible matching)
    sdgColumn = headers.find(h => 
      h.toLowerCase().includes('sdg') || 
      h.toLowerCase().includes('goal') ||
      h.toLowerCase() === 'sdg goal'
    );
    
    problemColumn = headers.find(h => 
      h.toLowerCase().includes('problem') || 
      h.toLowerCase().includes('statement')
    );
    
    // Find stakeholder columns (can be 3 separate columns or one combined)
    const stakeholderColumns = headers.filter(h => 
      h.toLowerCase().includes('stakeholder') || 
      h.toLowerCase().includes('recommended')
    );
    
    // Check for specific column names like "Stakeholder 1", "Stakeholder 2", etc.
    const stakeholder1Column = headers.find(h => 
      h.toLowerCase().includes('stakeholder 1') || 
      h.toLowerCase().includes('stakeholder1') ||
      h.toLowerCase() === 'stakeholder 1'
    );
    const stakeholder2Column = headers.find(h => 
      h.toLowerCase().includes('stakeholder 2') || 
      h.toLowerCase().includes('stakeholder2') ||
      h.toLowerCase() === 'stakeholder 2'
    );
    const stakeholder3Column = headers.find(h => 
      h.toLowerCase().includes('stakeholder 3') || 
      h.toLowerCase().includes('stakeholder3') ||
      h.toLowerCase() === 'stakeholder 3'
    );

    if (!sdgColumn || !problemColumn) {
      console.log('\n❌ Could not find required columns in Excel file');
      console.log('   Found columns:', headers.join(', '));
      console.log('\n   Required columns:');
      console.log('   - SDG Goal (or any column with "SDG" or "Goal" in name)');
      console.log('   - Problem Statement (or any column with "Problem" or "Statement" in name)');
      console.log('   - Recommended Stakeholder 1, 2, 3 (optional, separate columns)');
      console.log('   - OR Recommended Stakeholders (optional, single column with comma-separated values)');
      mongoose.connection.close();
      return;
    }

    console.log(`\n✅ Detected columns:`);
    console.log(`   - SDG Goal: ${sdgColumn}`);
    console.log(`   - Problem Statement: ${problemColumn}`);
    if (stakeholder1Column) console.log(`   - Stakeholder 1: ${stakeholder1Column}`);
    if (stakeholder2Column) console.log(`   - Stakeholder 2: ${stakeholder2Column}`);
    if (stakeholder3Column) console.log(`   - Stakeholder 3: ${stakeholder3Column}`);
    if (stakeholderColumns.length > 0 && !stakeholder1Column) {
      console.log(`   - Recommended Stakeholders: ${stakeholderColumns[0]}`);
    }

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    console.log('\n📥 Importing problem statements...\n');

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const sdgGoal = row[sdgColumn]?.toString().trim();
      const problemStatement = row[problemColumn]?.toString().trim();

      // Skip empty rows
      if (!sdgGoal || !problemStatement) {
        skipped++;
        console.log(`⚠️  Row ${i + 2}: Skipped (missing SDG Goal or Problem Statement)`);
        continue;
      }

      // Parse stakeholders - check for 3 separate columns first, then fall back to single column
      let recommendedStakeholders = [];
      
      // Method 1: Check for 3 separate stakeholder columns
      if (stakeholder1Column || stakeholder2Column || stakeholder3Column) {
        const s1 = stakeholder1Column ? row[stakeholder1Column]?.toString().trim() : '';
        const s2 = stakeholder2Column ? row[stakeholder2Column]?.toString().trim() : '';
        const s3 = stakeholder3Column ? row[stakeholder3Column]?.toString().trim() : '';
        
        if (s1) recommendedStakeholders.push(s1);
        if (s2) recommendedStakeholders.push(s2);
        if (s3) recommendedStakeholders.push(s3);
      }
      // Method 2: Check for single stakeholder column (comma-separated or single value)
      else if (stakeholderColumns.length > 0) {
        const stakeholdersStr = row[stakeholderColumns[0]]?.toString().trim() || '';
        if (stakeholdersStr) {
          recommendedStakeholders = stakeholdersStr
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0);
        }
      }

      try {
        // Check if problem already exists (same SDG and statement)
        const existing = await PredefinedProblem.findOne({
          sdgGoal: sdgGoal,
          problemStatement: problemStatement
        });

        if (existing) {
          skipped++;
          console.log(`⏭️  Row ${i + 2}: Skipped (already exists)`);
          continue;
        }

        // Create new predefined problem
        const problem = new PredefinedProblem({
          sdgGoal: sdgGoal,
          problemStatement: problemStatement,
          recommendedStakeholders: recommendedStakeholders
        });

        await problem.save();
        imported++;
        console.log(`✅ Row ${i + 2}: Imported - "${problemStatement.substring(0, 50)}..."`);
      } catch (error) {
        errors++;
        console.error(`❌ Row ${i + 2}: Error - ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Import Summary:');
    console.log(`   ✅ Successfully imported: ${imported}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log('='.repeat(50) + '\n');

    // Show summary by SDG
    const summary = await PredefinedProblem.aggregate([
      {
        $group: {
          _id: '$sdgGoal',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    if (summary.length > 0) {
      console.log('📋 Problem Statements by SDG Goal:');
      summary.forEach(item => {
        console.log(`   ${item._id}: ${item.count} problem(s)`);
      });
      console.log('');
    }

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error importing problems:', error);
    mongoose.connection.close();
  }
});

