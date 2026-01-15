import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const app = express();
app.use(cors());
app.use(express.json());

app.use(async (req, res, next) => {
  const username = req.header("X-User");
  if (!username) return res.status(401).json({ error: "Missing X-User" });

  const q = await pool.query(
    `INSERT INTO users (username)
     VALUES ($1)
     ON CONFLICT (username) DO UPDATE SET username=EXCLUDED.username
     RETURNING id`,
    [username]
  );
  req.userId = q.rows[0].id;
  next();
});

app.get("/categories", async (req, res) => {
  const result = await pool.query(
    "SELECT id, name FROM categories WHERE user_id=$1 ORDER BY name",
    [req.userId]
  );

  if (result.rows.length === 0) {
    const defaults = ["Groceries", "Transport", "Dining", "Utilities", "Entertainment", "Other"];
    for (const name of defaults) {
      await pool.query(
        "INSERT INTO categories (user_id, name) VALUES ($1, $2) ON CONFLICT (user_id, name) DO NOTHING",
        [req.userId, name]
      );
    }
    const newResult = await pool.query(
      "SELECT id, name FROM categories WHERE user_id=$1 ORDER BY name",
      [req.userId]
    );
    return res.json(newResult.rows);
  }

  res.json(result.rows);
});

app.post("/categories", async (req, res) => {
  const { name } = req.body;
  const r = await pool.query(
    "INSERT INTO categories (user_id, name) VALUES ($1, $2) ON CONFLICT (user_id, name) DO NOTHING RETURNING *",
    [req.userId, name]
  );
  res.json(r.rows[0] || {});
});

app.delete("/categories/:name", async (req, res) => {
  const name = decodeURIComponent(req.params.name);
  try {
    await pool.query(
      "DELETE FROM categories WHERE user_id=$1 AND name=$2",
      [req.userId, name]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting category:", err);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

app.get("/expenses", async (req, res) => {
  const r = await pool.query(
    `SELECT e.id, e.date::string AS date, e.amount, e.note, c.name AS category
     FROM expenses e
     LEFT JOIN categories c ON e.category_id = c.id
     WHERE e.user_id=$1
     ORDER BY e.date DESC`,
    [req.userId]
  );
  res.json(r.rows);
});

app.post("/expenses", async (req, res) => {
  const { category, date, amount, note } = req.body;

  try {
    let categoryId = null;
    if (category) {
      const catRes = await pool.query(
        "SELECT id FROM categories WHERE user_id=$1 AND name=$2",
        [req.userId, category]
      );
      if (catRes.rows.length > 0) {
        categoryId = catRes.rows[0].id;
      } else {
        const newCat = await pool.query(
          "INSERT INTO categories (user_id, name) VALUES ($1, $2) RETURNING id",
          [req.userId, category]
        );
        categoryId = newCat.rows[0].id;
      }
    }

    const expRes = await pool.query(
      `INSERT INTO expenses (user_id, category_id, date, amount, note)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, date, amount, note, category_id`,
      [req.userId, categoryId, date, amount, note]
    );

    const exp = expRes.rows[0];

    const catName = category || "Other";
    res.json({
      id: exp.id,
      date: String(date),
      amount: exp.amount,
      note: exp.note,
      category: catName
    });
  } catch (err) {
    console.error("Error inserting expense:", err);
    res.status(500).json({ error: "Failed to add expense" });
  }
});


app.put("/expenses/:id", async (req, res) => {
  const { id } = req.params;
  const { category, date, amount, note } = req.body;
  try {
    let categoryId = null;
    let categoryName = category || null;
    if (categoryName) {
      const c = await pool.query(
        "SELECT id FROM categories WHERE user_id=$1 AND name=$2",
        [req.userId, categoryName]
      );
      if (c.rows[0]) {
        categoryId = c.rows[0].id;
      } else {
        const ins = await pool.query(
          "INSERT INTO categories (user_id, name) VALUES ($1,$2) RETURNING id",
          [req.userId, categoryName]
        );
        categoryId = ins.rows[0].id;
      }
    }

    const r = await pool.query(
      `UPDATE expenses
       SET date=$1, amount=$2, note=$3, category_id=$4
       WHERE id=$5 AND user_id=$6
       RETURNING id, date, amount, note, category_id`,
      [date, amount, note, categoryId, id, req.userId]
    );
    if (!r.rows[0]) return res.status(404).json({ error: "Not found" });

    if (!categoryName && r.rows[0].category_id) {
      const cn = await pool.query("SELECT name FROM categories WHERE id=$1", [r.rows[0].category_id]);
      categoryName = cn.rows[0]?.name || null;
    }

    res.json({
      id: r.rows[0].id,
      date: String(date),
      amount: r.rows[0].amount,
      note: r.rows[0].note,
      category: categoryName
    });
  } catch (err) {
    console.error("Error updating expense:", err);
    res.status(500).json({ error: "Failed to update expense" });
  }
});

app.delete("/expenses/:id", async (req, res) => {
  const { id } = req.params;
  await pool.query("DELETE FROM expenses WHERE id=$1 AND user_id=$2", [id, req.userId]);
  res.json({ success: true });
});

app.get("/budgets", async (req, res) => {
  const r = await pool.query(
    "SELECT month, amount FROM budgets WHERE user_id=$1 ORDER BY month DESC",
    [req.userId]
  );
  res.json(r.rows);
});

app.post("/budgets", async (req, res) => {
  const { month, amount } = req.body;
  const r = await pool.query(
    `INSERT INTO budgets (user_id, month, amount)
     VALUES ($1,$2,$3)
     ON CONFLICT (user_id, month)
     DO UPDATE SET amount=EXCLUDED.amount
     RETURNING *`,
    [req.userId, month, amount]
  );
  res.json(r.rows[0]);
});

app.get("/health", (_, res) => res.json({ ok: true }));

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));