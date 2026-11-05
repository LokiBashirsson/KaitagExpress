import type { Request, Response } from "express";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import { Pool } from "pg";
import express from "express";
import cors from "cors";

dotenv.config();

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
  process.env;

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME || "",
  api_key: CLOUDINARY_API_KEY || "",
  api_secret: CLOUDINARY_API_SECRET || "",
  secure: true,
});

const app = express();
const port = 9000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "kaitag_express_database",
  password: "123",
  port: 5432,
});

pool
  .connect()
  .then(() => console.log("Подключение к базе данных успешно установлено!"))
  .catch((error: any) =>
    console.error("Ошибка при подключении к базе данных:", error),
  );

app.get("/", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
      `);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Ошибка на сервере" });
  }
});

app.get("/furnitures", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM furnitures;");
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Ошибка при выборке из БД:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

app.post("/furnitures", async (req: Request, res: Response) => {
  const { image, name, price } = req.body;
  try {
    console.log("Входящие данные:", req.body);

    if (!name || !price) {
      res
        .status(400)
        .json({ error: "Поля name и price обязательны для заполнения" });
      return;
    }

    const result = await pool.query(
      `
      INSERT INTO furnitures (image, name, price) 
      VALUES ($1, $2, $3) 
      RETURNING *;
    `,
      [image ? image : null, name, price],
    );

    res.status(201).json({
      message: "Данные успешно добавлены в базу данных!",
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error("Ошибка при вставке в БД:", error);
    res.status(500).json({ error: "Ошибка сервера", details: error.message });
  }
});

app.put("/furnitures/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { image, name, price } = req.body;
  try {
    const result = await pool.query(
      `
    UPDATE furnitures
    SET image = $1, name = $2, price = $3
    WHERE id = $4
    RETURNING *;
    `,
      [image ? image : null, name, price, id],
    );
    res.status(200).json({
      message: "Данные успешно обновлены в базе данных!",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Ошибка при обновлении в БД:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

app.delete("/furnitures/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM furnitures WHERE id = $1", [id]);
    res.status(200).json({ message: "Данные успешно удалены из базы данных!" });
  } catch (error) {
    console.error("Ошибка при удалении из БД:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

app.listen(port, () => {
  console.log(`Сервер подключен через http://localhost:${port}`);
});
