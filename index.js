import express from "express";
import bcrypt from "bcrypt";
import User from "./models/user.js";


const app = express();
const port = 3333;

const users = [];

app.use(express.json());
app.get("/", (req, res) => {
  res.send("Hello node js!");
});

// register
app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    users.push({ username, password: hashedPassword });
    console.log(users);

    res.status(201).send("user successfully registred!");

  } catch (error) {
    res.status(500).send("Registration failed!");
  }
});

// login
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = users.find((user) => user.username === username); // идем в базу данных
    if (!user) {
      return res.status(400).send("Username or password is invalid");
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).send("Password or password is invalid");
    }
    res.send("Successfull access to your profile!");
  } catch (error) {
    res.status(500).send("Server error");
  }
});

app.listen(port, ()=>{
    console.log(`Server is running on http://localhost:${port}`)
})