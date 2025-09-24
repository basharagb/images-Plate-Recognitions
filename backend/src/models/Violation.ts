import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// Define the attributes interface
export interface ViolationAttributes {
  id: number;
  plateNumber: string;
  imageUrl: string;
  timestamp: Date;
  confirmed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Define creation attributes (optional fields for creation)
export interface ViolationCreationAttributes 
  extends Optional<ViolationAttributes, 'id' | 'createdAt' | 'updatedAt' | 'confirmed'> {}

// Define the model class
class Violation extends Model<ViolationAttributes, ViolationCreationAttributes> 
  implements ViolationAttributes {
  public id!: number;
  public plateNumber!: string;
  public imageUrl!: string;
  public timestamp!: Date;
  public confirmed!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// Initialize the model
Violation.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    plateNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 20],
      },
    },
    imageUrl: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    confirmed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Violation',
    tableName: 'violations',
    indexes: [
      {
        fields: ['plateNumber'],
      },
      {
        fields: ['confirmed'],
      },
      {
        fields: ['timestamp'],
      },
    ],
  }
);

export default Violation;
