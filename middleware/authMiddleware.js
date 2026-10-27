

import User from "../models/user.js";
import jwt from "jsonwebtoken"; // Импортируем библиотеку для работы с JWT

// ============================================
// 1. ОБЫЧНАЯ АВТОРИЗАЦИЯ
// Используется для /profile, /admin и других
// защищённых маршрутов
// ============================================

function authenticateJWT(req, res, next) { // Создаём middleware для проверки обычного токена

  const authHeader = req.headers.authorization; // Получаем заголовок Authorization из запроса

  if (!authHeader || !authHeader.startsWith("Bearer ")) { // Проверяем, что заголовок существует и начинается с Bearer
    return res.status(401).json({ // Если токена нет, возвращаем ошибку 401
      message: "Unauthorized: No token provided", // Сообщение об отсутствии токена
    }); // Завершаем отправку ответа
  } // Конец проверки наличия токена

  const token = authHeader.split(" ")[1]; // Извлекаем сам JWT после слова Bearer

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => { // Проверяем подпись и срок действия токена

    if (err || !decoded || typeof decoded !== "object") { // Проверяем, что токен действительный и содержит данные
      return res.status(401).json({ // Возвращаем ошибку 401
        message: "Unauthorized: Invalid or expired token", // Сообщение о недействительном токене
      }); // Завершаем отправку ответа
    } // Конец проверки токена

    if (decoded.purpose !== undefined) { // Запрещаем любые специальные токены, включая password-change
      return res.status(403).json({ // Возвращаем ошибку 403
        message: "Special token cannot access this route", // Сообщаем об отсутствии доступа
      }); // Завершаем отправку ответа
    } // Конец проверки назначения токена

    if (!decoded.id) { // Проверяем, что токен содержит ID пользователя
      return res.status(401).json({ // Возвращаем ошибку 401
        message: "Unauthorized: User ID missing", // Сообщаем об отсутствии ID
      }); // Завершаем отправку ответа
    } // Конец проверки ID

    // Ищем пользователя в базе данных по ID из токена
User.findByPk(decoded.id)
  .then((user) => {

    // Проверяем, существует ли пользователь
    if(!user){
      return res.status(401).json({
          message: "User not found",
      });
      
    }
    // ПРоверяем версию JWT
    if (decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({
        message: "Token is no longer valid"
      });
    }

    // Проверяем, обязан ли пользователь сменить пароль
    if (user.mustChangePassword) {
      return res.status(403).json({
        message: "Password change required"
      });
    }

    // Сохраняем данные пользователя из токена
    req.user = decoded;

    // Разрешаем выполнение следующего обработчика
    next();
  })
  .catch((error) => {

    // Выводим ошибку базы данных в терминал
    console.error("Authentication error:", error);

    // Отправляем ответ об ошибке сервера
    return res.status(500).json({
      message: "Server error"
    });
  });
  }); // Конец проверки JWT
} // Конец middleware authenticateJWT


// ============================================
// 2. АВТОРИЗАЦИЯ ДЛЯ СМЕНЫ ПАРОЛЯ
// Используется для POST /change-password
// ============================================

function authenticatePasswordChange(req, res, next) { // Создаём middleware для смены пароля

  const authHeader = req.headers.authorization; // Получаем заголовок Authorization

  if (!authHeader || !authHeader.startsWith("Bearer ")) { // Проверяем наличие Bearer-токена
    return res.status(401).json({ // Возвращаем ошибку 401
      message: "Unauthorized: No token provided", // Сообщение об отсутствии токена
    }); // Завершаем отправку ответа
  } // Конец проверки заголовка

  const token = authHeader.split(" ")[1]; // Получаем JWT из заголовка

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => { // Проверяем подпись и срок действия токена

    if (err || !decoded || typeof decoded !== "object") { // Проверяем действительность токена
      return res.status(401).json({ // Возвращаем ошибку 401
        message: "Unauthorized: Invalid or expired token", // Сообщение об ошибке токена
      }); // Завершаем отправку ответа
    } // Конец проверки токена

    if (
      decoded.purpose !== undefined && // Проверяем, указано ли специальное назначение
      decoded.purpose !== "password-change" // Разрешаем только назначение password-change
    ) {
      return res.status(403).json({ // Запрещаем токены с другим назначением
        message: "Forbidden: Invalid token purpose", // Сообщение об отказе в доступе
      }); // Завершаем отправку ответа
    } // Конец проверки назначения

    if (!decoded.id) { // Проверяем наличие ID пользователя
      return res.status(401).json({ // Возвращаем ошибку 401
        message: "Unauthorized: User ID missing", // Сообщение об отсутствии ID
      }); // Завершаем отправку ответа
    } // Конец проверки ID

   // Ищем пользователя в базе данных по ID из JWT
User.findByPk(decoded.id)
  .then((user) => {

    // Если пользователь не найден, запрещаем доступ
    if (!user) {
      return res.status(401).json({
        message: "User not found"
      });
    }
    // Проверяем версию токена
if (decoded.tokenVersion !== user.tokenVersion) {
  return res.status(401).json({
    message: "Token is no longer valid",
  });
}

    // Если используется специальный токен смены пароля
    if (decoded.purpose === "password-change") {

      // Проверяем, требуется ли пользователю сменить пароль
      if (!user.mustChangePassword) {
        return res.status(403).json({
          message: "Password change token is no longer valid"
        });
      }
    }

    // Сохраняем данные пользователя из токена
    req.user = decoded;

    // Передаём управление маршруту /change-password
    next();
  })
  .catch((error) => {

    // Выводим ошибку базы данных в терминал
    console.error("Password change authentication error:", error);

    // Возвращаем ошибку сервера
    return res.status(500).json({
      message: "Server error"
    });
  });
  }); // Конец проверки JWT
} // Конец middleware authenticatePasswordChange


// Проверяем, является ли пользователь администратором
async function requireAdmin(req, res, next) {
  try {
    // Находим пользователя по ID из JWT
    const user = await User.findByPk(req.user.id);

    // Проверяем существование пользователя
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Проверяем роль пользователя
    if (user.role !== "admin") {
      return res.status(403).json({
        message: "Access denied. Admins only",
      });
    }

    // Если роль admin, разрешаем доступ
    next();

  } catch (error) {
    console.error("Admin middleware error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
}


export default authenticateJWT; // Экспортируем обычный middleware по умолчанию

export { authenticatePasswordChange, requireAdmin }; // Экспортируем отдельный middleware для смены пароля
