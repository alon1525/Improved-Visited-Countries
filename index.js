import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = 3000;

const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

async function getUsers(){
  const result = await db.query("SELECT * FROM users");
  return result.rows;
}

async function getColor(){
  const result = await db.query("SELECT color FROM users WHERE id = $1", [currentUserId]);
  return result.rows[0].color;
}

async function checkVisisted() {
  const result = await db.query("SELECT * FROM visited_countries JOIN users ON visited_countries.user_id = users.id WHERE user_id = $1", [currentUserId]);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}
app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: await getUsers(),
    color: await getColor(),
  });
});
//add country
app.post("/add", async (req, res) => {
  const input = req.body["country"];

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code,user_id) VALUES ($1,$2)",
        [countryCode,currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});
//change to other account
app.post("/user", async (req, res) => {
  if(req.body.add === "new"){
    res.render("new.ejs")
  }
  else{
    currentUserId = req.body.user;
    res.redirect('/');
  }
});

//add user
app.post("/new", async (req, res) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html
  const pickedColor = req.body.color;
  const pickedName = req.body.name;
  await db.query(
    "INSERT INTO users (name,color) VALUES ($1,$2)",
    [pickedName,pickedColor]
  )
  res.redirect('/');
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
