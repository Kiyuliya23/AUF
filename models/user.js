import sequelize from "../config/db.js";
import { DataTypes } from "sequelize";

const user= sequelize.define(
    "Category",
    {
        id:{
          type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,  
        },
        username: {
          type: DataTypes.STRING,
      allowNull: false,
      unique: true,  
        },
        password: {
  type: DataTypes.STRING,
  allowNull: false,
}
    },
    {
      tableName: "user",
      timestamps: false,
    }
);
export default user;