'use strict';

/** @type {import('sequelize-cli').Migration} */

module.exports = {

  // Добавляем новый столбец в таблицу
  async up(queryInterface, Sequelize) {

    await queryInterface.addColumn(
      "user",              // Название таблицы
      "tokenVersion",      // Название нового столбца
      {
        type: Sequelize.INTEGER, // Целое число
        allowNull: false,        // Не допускаем NULL
        defaultValue: 0,         // Начальное значение
      }
    );

  },

  // Откатываем миграцию
  async down(queryInterface, Sequelize) {

    await queryInterface.removeColumn(
      "user",              // Название таблицы
      "tokenVersion"       // Удаляем только этот столбец
    );

  },

};