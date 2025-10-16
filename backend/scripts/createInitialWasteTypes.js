const mongoose = require('mongoose');
const dotenv = require('dotenv');
const WasteType = require('../models/WasteType');

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const createInitialWasteTypes = async () => {
  try {
    console.log('🗑️ Creating initial waste types...');
    
    // Clear existing waste types
    await WasteType.deleteMany({});
    console.log('✅ Cleared existing waste types');

    const wasteTypes = [
      {
        type: 'food',
        name: 'Food Waste',
        description: 'Organic food waste and biodegradable materials',
        baseCost: 20.00,
        restrictions: [
          'Only organic food materials',
          'No packaging materials',
          'Must be separated from other waste',
          'Maximum weight: 15kg per collection'
        ],
        maxWeight: 15,
        isActive: true
      },
      {
        type: 'polythene',
        name: 'Polythene Waste',
        description: 'Plastic bags, polythene covers and plastic packaging',
        baseCost: 30.00,
        restrictions: [
          'Clean plastic materials only',
          'No contaminated plastics',
          'Remove all labels and stickers',
          'Bundle plastics properly'
        ],
        maxWeight: 25,
        isActive: true
      },
      {
        type: 'paper',
        name: 'Paper Waste',
        description: 'Newspapers, cardboard, office papers and books',
        baseCost: 25.00,
        restrictions: [
          'Dry paper materials only',
          'No wet or contaminated paper',
          'Remove plastic covers and bindings',
          'Bundle papers neatly'
        ],
        maxWeight: 30,
        isActive: true
      },
      {
        type: 'hazardous',
        name: 'Hazardous Waste',
        description: 'Chemicals, batteries, paints and dangerous materials',
        baseCost: 50.00,
        restrictions: [
          'Items must be in original containers',
          'No mixing of different chemicals',
          'Requires special handling certification',
          'Advance booking required'
        ],
        maxWeight: 10,
        isActive: true
      },
      {
        type: 'ewaste',
        name: 'E-Waste',
        description: 'Electronic items, computers, phones and electronic appliances',
        baseCost: 45.00,
        restrictions: [
          'Remove batteries before disposal',
          'Wipe personal data from devices',
          'No broken screens or sharp edges exposed',
          'Small electronics in boxes'
        ],
        maxWeight: 50,
        isActive: true
      }
    ];

    const createdTypes = await WasteType.insertMany(wasteTypes);
    console.log(`✅ Created ${createdTypes.length} waste types`);

    console.log('\n📋 Waste Types Created:');
    createdTypes.forEach(type => {
      console.log(`   ${type.name}: $${type.baseCost} (${type.type})`);
    });

    console.log('\n🎉 Initial waste types creation completed successfully!');
  } catch (error) {
    console.error('❌ Error creating waste types:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📝 Database connection closed');
  }
};

if (require.main === module) {
  connectDB().then(() => {
    createInitialWasteTypes();
  });
}

module.exports = { createInitialWasteTypes };
