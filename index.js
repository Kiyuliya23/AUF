import express from "express";
import bcrypt from "bcrypt";
import User from "./models/user.js";
import { where } from "sequelize";
import cors from "cors";
import sequelize from "./config/db.js";
import jwt from "jsonwebtoken";
import authenticateJWT, { authenticatePasswordChange, requireAdmin, } from "./middleware/authMiddleware.js";




// authenticateJWT проверяет авторизацию.
// User.findByPk() находит пользователя.
// bcrypt.compare() проверяет его текущий пароль.
// User.findOne() проверяет уникальность нового email.
// user.save() сохраняет изменения в MySQL.

const app = express();
const port = 3333;

app.use(express.json());



app.get("/profile",authenticateJWT, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if(!user){
      return res.status(401).json({
         message: "User not found",
      });
    }
    res.status(200).json({
      id: user.id,
      email: user.email,
      role: user.role,
    });

  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({
      message: "Server error",
    });
  }
});


// Маршрут доступен только администратору
app.get("/admin", authenticateJWT, requireAdmin, (req, res) => {
  return res.status(200).json({
    message: "Welcome to admin panel",
  });
});

// register
app.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    // проверяем , что пользователь ввел email password
    if(!email || !password){
      return res.status(400).json({
         message: "Email and password are required"
      });
    }
    // проверяем существует ли пользователь с таким email
    const  existingUser = await User.findOne({
      where: { email }
    });
    if(existingUser){
      return res.status(409).json({
         message: "Email already registered"
      });
    }
    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    //создаем нового пользователя в базе данных 
    const newUser = await User.create({
      email,
      password:  hashedPassword
    });

    //Возращаем ответ 
    res.status(201).json({
       message: "User successfully registered",
      id: newUser.id,
      email: newUser.email
    });
    
  } catch (error) {
     console.error("Registration error:", error);

    res.status(500).json({ message: "Registration failed"});
  }
});

// login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if(!email || !password){
      return res.status(400).json({
         message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      where: { email },
  }); // идем в базу данных
    if (!user) {
      return res.status(400).send("Email or password is invalid");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).send("Email or password is invalid");
    }

    if (user.mustChangePassword) {
  const changeToken = jwt.sign(
    {
      id: user.id,
      purpose: "password-change",
       tokenVersion: user.tokenVersion,

    },
    process.env.JWT_SECRET,
    { expiresIn: "10m" }
  );

  return res.status(403).json({
    message: "Password change required",
    changeToken
  });
}
const token = jwt.sign(
  {
    id: user.id,
    tokenVersion: user.tokenVersion,
  },
  process.env.JWT_SECRET,
  { expiresIn: "1h" }
);

return res.status(200).json({
  message: "Successful login",
  token
});

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).send("Server error");
  }
});


  app.post("/change-password", authenticatePasswordChange, async (req, res)=>{
  try {
    const { currentPassword, newPassword } = req.body

    const user = await User.findByPk(req.user.id);
    if (!user) {
  return res.status(404).json({
    message: "User not found"
  });
}
    if(!newPassword){
      return res.status(400).json({ message: "New password is required",});
    }
    // Если пользователь использует обычный JWT
if (req.user.purpose !== "password-change") {

  // Проверяем, передал ли пользователь текущий пароль
  if (!currentPassword) {
    return res.status(400).json({
      message: "Current password is required"
    });
  }

  // Сравниваем текущий пароль с хешем в базе данных
  const isPasswordValid = await bcrypt.compare(
    currentPassword,
    user.password
  );

  // Если текущий пароль неверный, запрещаем смену
  if (!isPasswordValid) {
    return res.status(400).json({
      message: "Current password is invalid"
    });
  }
}
    const hashedPassword = await bcrypt.hash(newPassword, 10);

     user.password = hashedPassword;
     user.mustChangePassword = false;
     // Увеличиваем версию токенов пользователя на 1
      user.tokenVersion += 1;

     await user.save();
     res.status(200).json({
      message: "Password changed successfully"
     });
    
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
       message: "Server error",
    });
    
  }
} );

sequelize.authenticate()
  .then(() => console.log("MySQL connected successfully"))
  .catch((error) => console.error("MySQL connection error:", error));


  // Удаление аккаунта
app.post("/delete-account", authenticateJWT, async (req, res) => {
  try {
    // Получаем пароль для подтверждения удаления
    const { password } = req.body;

    // Проверяем, передан ли пароль
    if (!password) {
      return res.status(400).json({
        message: "Password is required",
      });
    }

    // Находим авторизованного пользователя
    const user = await User.findByPk(req.user.id);

    // Проверяем, существует ли пользователь
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Сравниваем введённый пароль с хешем в базе
    const isPasswordValid = await bcrypt.compare(
      password,
      user.password
    );

    // Если пароль неправильный, запрещаем удаление
    if (!isPasswordValid) {
      return res.status(400).json({
        message: "Invalid password",
      });
    }

    // Удаляем пользователя из базы данных
    await user.destroy();

    // Возвращаем сообщение об успешном удалении
    return res.status(200).json({
      message: "Account deleted successfully",
    });

  } catch (error) {
    console.error("Delete account error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});
// Смена email пользователя
app.post("/update-email", authenticateJWT, async (req, res) => {
  try {
    // Получаем новый email и текущий пароль
    const { newEmail, currentPassword } = req.body;

    // Проверяем наличие данных
    if (!newEmail || !currentPassword) {
      return res.status(400).json({
        message: "New email and current password are required",
      });
    }

    // Находим авторизованного пользователя
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Проверяем текущий пароль
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isPasswordValid) {
      return res.status(400).json({
        message: "Current password is invalid",
      });
    }

    // Проверяем, не занят ли новый email
    const existingUser = await User.findOne({
      where: { email: newEmail },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    // Сохраняем новый email
    user.email = newEmail;
    await user.save();

    return res.status(200).json({
      message: "Email changed successfully",
      email: user.email,
    });

  } catch (error) {
    console.error("Change email error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});

// Обновление роли пользователя — только для администратора
app.put("/update-role", authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { userId, newRole } = req.body;

    if (!userId || !newRole) {
      return res.status(400).json({
        message: "User ID and new role are required",
      });
    }

    if (!["user", "admin"].includes(newRole)) {
      return res.status(400).json({
        message: "Invalid role",
      });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    user.role = newRole;
    user.tokenVersion += 1;
    await user.save();

    return res.status(200).json({
      message: "User role updated successfully",
      id: user.id,
      role: user.role,
    });
  } catch (error) {
    console.error("Update role error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});

// Обновление JWT-токена
app.post("/refresh-token", authenticateJWT, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const newToken = jwt.sign(
      {
        id: user.id,
        tokenVersion: user.tokenVersion,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.status(200).json({
      message: "Token refreshed successfully",
      token: newToken,
    });
  } catch (error) {
    console.error("Refresh token error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});





app.listen(port, ()=>{
    console.log(`Server is running on http://127.0.0.1 :${port}`)
});