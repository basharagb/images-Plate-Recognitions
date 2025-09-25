import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// Define the attributes interface
export interface ViolationAttributes {
  id: number;
  plateNumber: string;
  imageUrl: string;
  originalFileName?: string;
  processingMethod?: string;
  confidence?: number;
  vehicleInfo?: string;
  cameraId?: string;
  location?: string;
  speed?: number;
  speedLimit?: number;
  timestamp: Date;
  confirmed: boolean;
  status?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Define creation attributes (optional fields for creation)
export interface ViolationCreationAttributes 
  extends Optional<ViolationAttributes, 'id' | 'createdAt' | 'updatedAt' | 'confirmed' | 'timestamp'> {}

// Define the model class
class Violation extends Model<ViolationAttributes, ViolationCreationAttributes> 
  implements ViolationAttributes {
  public id!: number;
  public plateNumber!: string;
  public imageUrl!: string;
  public originalFileName?: string;
  public processingMethod?: string;
  public confidence?: number;
  public vehicleInfo?: string;
  public cameraId?: string;
  public location?: string;
  public speed?: number;
  public speedLimit?: number;
  public timestamp!: Date;
  public confirmed!: boolean;
  public status?: string;
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
    originalFileName: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    processingMethod: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    confidence: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        min: 0,
        max: 100,
      },
    },
    vehicleInfo: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    cameraId: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    speed: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    speedLimit: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
    status: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'pending',
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
        fields: ['plate_number'],
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
