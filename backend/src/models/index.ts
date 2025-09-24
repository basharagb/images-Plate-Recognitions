import sequelize from '../config/database';
import Violation from './Violation';

// Initialize all models
const models = {
  Violation,
};

// Set up associations here if needed
// Example: User.hasMany(Violation);

// Sync database
export const syncDatabase = async (force = false) => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    await sequelize.sync({ force });
    console.log('✅ Database synchronized successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    throw error;
  }
};

export { sequelize };
export default models;
