import sequelize from '../config/database';
import Violation from './Violation';
import Car from './Car';

// Initialize all models
const models = {
  Violation,
  Car,
};

// Set up associations here if needed
// Example: User.hasMany(Violation);

// Sync database
export const syncDatabase = async (force = false) => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Use alter: true to safely add new columns without losing data
    await sequelize.sync({ alter: true });
    console.log('✅ Database synchronized successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    throw error;
  }
};

export { sequelize };
export default models;
