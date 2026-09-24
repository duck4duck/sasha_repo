import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pool = mysql.createPool({
  host: process.env.DB_HOST ?? 'localhost', port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'root', password: process.env.DB_PASSWORD ?? '', database: process.env.DB_NAME ?? 'dbBelt',
  waitForConnections: true, connectionLimit: 5
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/categories', async (_req, res, next) => {
  try { const [rows] = await pool.query('SELECT id, client_type, code, name FROM categories ORDER BY client_type, name'); res.json(rows); } catch (error) { next(error); }
});

app.get('/api/tariffs', async (req, res, next) => {
  try {
    const ids = String(req.query.categoryIds ?? '').split(',').filter(Boolean).map(Number).filter(Number.isInteger);
    const params = []; let sql = `SELECT t.id, t.category_id, t.name, t.base_price, t.is_archived, t.description, c.name AS category, c.client_type
      FROM tarifs t JOIN categories c ON c.id = t.category_id`;
    if (ids.length) { sql += ` WHERE t.category_id IN (${ids.map(() => '?').join(',')})`; params.push(...ids); }
    sql += ' ORDER BY c.name, t.name'; const [rows] = await pool.query(sql, params); res.json(rows);
  } catch (error) { next(error); }
});

app.get('/api/promotions', async (req, res, next) => {
  try {
    const values = [], where = ['p.is_active = 1'];
    const clientType = req.query.clientType;
    if (clientType === 'b2c' || clientType === 'b2b') { where.push('p.client_type = ?'); values.push(clientType); }
    if (req.query.isNew === 'true') where.push('(p.is_new_client = 1 OR p.is_new_client IS NULL)');
    if (req.query.isNew === 'false') where.push('(p.is_new_client = 0 OR p.is_new_client IS NULL)');
    if (req.query.retention === 'true') where.push('p.is_retention_only = 1');
    if (Number.isInteger(Number(req.query.years))) { where.push('(p.min_years IS NULL OR p.min_years <= ?)'); values.push(Number(req.query.years)); }
    const categoryIds = String(req.query.categoryIds ?? '').split(',').filter(Boolean).map(Number).filter(Number.isInteger);
    if (categoryIds.length) { where.push(`EXISTS (SELECT 1 FROM promotion_categories pc WHERE pc.promotion_id = p.id AND pc.category_id IN (${categoryIds.map(() => '?').join(',')}))`); values.push(...categoryIds); }
    if (req.query.tariffId && Number.isInteger(Number(req.query.tariffId))) { where.push('EXISTS (SELECT 1 FROM promo_compatible_tariffs pt WHERE pt.promotions_id = p.id AND pt.tarifs_id = ?)'); values.push(Number(req.query.tariffId)); }
    const sql = `SELECT p.*, GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR '|') AS categories,
      GROUP_CONCAT(DISTINCT t.name ORDER BY t.name SEPARATOR '|') AS tariffs
      FROM promotions p LEFT JOIN promotion_categories pc ON pc.promotion_id = p.id
      LEFT JOIN categories c ON c.id = pc.category_id LEFT JOIN promo_compatible_tariffs pt ON pt.promotions_id = p.id
      LEFT JOIN tarifs t ON t.id = pt.tarifs_id WHERE ${where.join(' AND ')} GROUP BY p.id ORDER BY p.start_date DESC, p.name`;
    const [rows] = await pool.query(sql, values); res.json(rows);
  } catch (error) { next(error); }
});

app.use((error, _req, res, _next) => { console.error(error); res.status(500).json({ message: 'Не удалось получить данные. Проверьте подключение к базе данных.' }); });
app.listen(Number(process.env.PORT ?? 3000), () => console.log(`Приложение запущено: http://localhost:${process.env.PORT ?? 3000}`));
