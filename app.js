const express = require("express");
const app = express();
const path = require("path");
const dbPath = path.join(__dirname, "userData.db");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
app.use(express.json());
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3002, () => {
      console.log("Server is running at 3002");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

//API 1
app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(request.body.password, 10);
  const getUserQuery = `
        SELECT * FROM user WHERE username = '${username}';
    `;
  const dbUser = await db.get(getUserQuery);

  if (dbUser !== undefined) {
    response.status(400);
    response.send("User already exists");
  } else {
    const lenOfPassword = password.length;
    if (lenOfPassword >= 5) {
      const createUserRegisterQuery = `
                    INSERT INTO 
                    user (username, name, password, gender, location)
                    VALUES
                    (
                        '${username}',
                        '${name}',
                        '${hashedPassword}',
                        '${gender}',
                        '${location}'
                    ); `;

      await db.run(createUserRegisterQuery);
      response.status(200);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  }
});

//API 2
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const getLoginUserQuery = `
        SELECT * FROM user WHERE username = '${username}';
    `;
  const dbLoginUser = await db.get(getLoginUserQuery);

  if (dbLoginUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      dbLoginUser.password
    );
    if (isPasswordMatched === true) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//API 3
app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const getChangePasswordUserQuery = `
        SELECT * FROM user WHERE username = '${username}';
    `;
  const changeUser = await db.get(getChangePasswordUserQuery);

  if (changeUser === undefined) {
    response.status(400);
    response.send("User not registered");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      oldPassword,
      changeUser.password
    );
    if (isPasswordMatched === true) {
      const lenOfNewPassword = newPassword.length;
      if (lenOfNewPassword < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const createdPassword = await bcrypt.hash(newPassword, 10);
        const updatePasswordQuery = `
                    UPDATE 
                    user 
                    SET 
                    password = '${createdPassword}'
                    WHERE 
                    username = '${username}';
                `;
        await db.run(updatePasswordQuery);
        response.status(200);
        response.send("Password updated");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
