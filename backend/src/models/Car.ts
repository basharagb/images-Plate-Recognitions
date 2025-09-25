import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// Define the attributes interface
export interface CarAttributes {
  id: number;
  plateNumber: string;
  color: string;
  type: string;
  imageUrl: string;
  detectionId?: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Define creation attributes (optional fields for creation)
export interface CarCreationAttributes 
  extends Optional<CarAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

// Define the model class
class Car extends Model<CarAttributes, CarCreationAttributes> 
  implements CarAttributes {
  public id!: number;
  public plateNumber!: string;
  public color!: string;
  public type!: string;
  public imageUrl!: string;
  public detectionId?: string;
  public timestamp!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// Initialize the model
Car.init(
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
        len: [2, 20],
        is: /^[A-Z0-9]+$/i, // Allow letters and numbers only
      },
    },
    color: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 20],
      },
    },
    type: {
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
    detectionId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Identifier for the detection method used (e.g., strict_, regular_)',
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
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
    modelName: 'Car',
    tableName: 'cars',
    indexes: [
      {
        fields: ['plate_number'],
      },
      {
        fields: ['color'],
      },
      {
        fields: ['type'],
      },
      {
        fields: ['timestamp'],
      },
    ],
  }
);

export default Car;
