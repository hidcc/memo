require('dotenv').config();

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();

app.use(express.static('public'));

app.use(express.urlencoded({extended: false}));

app.set('view engine', 'ejs');
app.set('views', './views');  // ejsファイルを置いているフォルダ

const db = new sqlite3.Database('./app_list.sqlite3', (err) => {
  if (err) {
    console.error('データベース接続エラー:', err.message);
  } else {
    console.log('SQLiteデータベースに接続しました');
  }
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

app.get("/",(req,res) => {
  res.render("top.ejs");
});

app.get("/index", (req, res) => {
  db.all("SELECT ROW_NUMBER() OVER (ORDER BY created_at) AS no,id,name,description,DATE(created_at) as created_at FROM items", [], (error, results) => {
    if (error) {
      console.error("データベースクエリのエラー:", error.message);
      return res.status(500).send("データベースエラーが発生しました。");
    }
    console.log(results);
    res.render("index.ejs", { items: results });
  });
});
app.get("/new",(req,res) => {
  res.render("new.ejs")
});


app.post('/create', (req, res) => {
  const name = req.body.itemName;
  const description = req.body.description;  // フォームのname属性を "description" にしておく

  db.run(
    "INSERT INTO items(name, description) VALUES(?, ?)",
    [name, description],
    function (error) {
      if (error) {
        console.error("INSERTエラー:", error.message);
        return res.status(500).send("データベースエラーが発生しました。");
      }
      res.redirect('/index');
    }
  );
});


app.post('/delete/:id', (req, res) => {
  const id = req.params.id;

  db.run("DELETE FROM items WHERE id = ?", [id], function(err) {
    if (err) {
      console.error("削除中にエラーが発生しました:", err.message);
      res.status(500).send("削除に失敗しました");
      return;
    }

    res.redirect('/index');
  });
});

app.get('/edit/:id', (req, res) => {
  const id = req.params.id;

  db.get("SELECT * FROM items WHERE id = ?", [id], (err, row) => {
    if (err) {
      console.error("データ取得中にエラーが発生しました:", err.message);
      res.status(500).send("データの取得に失敗しました");
      return;
    }

    if (!row) {
      res.status(404).send("指定されたメモが見つかりませんでした");
      return;
    }

    res.render("edit.ejs", { item: row });
  });
});

app.post('/update/:id', (req, res) => {
  const id = req.params.id;
  const name = req.body.itemName;
  const description = req.body.description;

  db.run("UPDATE items SET name = ?, description = ? WHERE id = ?", 
    [name, description, id], 
    function(err) {
      if (err) {
        console.error("更新中にエラーが発生しました:", err.message);
        res.status(500).send("更新に失敗しました");
        return;
      }
      res.redirect("/index");
    }
  );
});
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
