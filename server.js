// 1. Importaciones y Configuración
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Airtable = require('airtable');

const app = express();
const PORT = process.env.PORT || 3000; 
const basePath = process.env.BASE_PATH || '';

// Configurar Express y Middlewares
app.set('view engine', 'ejs');
// CORRECCIÓN: Servir archivos estáticos bajo la ruta base
app.use(basePath, express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Pasar basePath a todas las plantillas
app.use((req, res, next) => {
    res.locals.basePath = basePath;
    next();
});

// Configurar Multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 2. Inicializar APIs
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

// 3. Middleware de Autenticación
const requireLogin = (req, res, next) => {
    const token = req.cookies.authToken;
    if (!token) return res.redirect(`${basePath}/login`);

    try {
        jwt.verify(token, process.env.SESSION_SECRET);
        next();
    } catch (error) {
        res.redirect(`${basePath}/login`);
    }
};

// 4. Rutas de la Aplicación
// (El resto del archivo no necesita cambios)

// Rutas de Login y Logout
app.get(`${basePath}/login`, (req, res) => res.render('login', { error: null }));
app.post(`${basePath}/login`, (req, res) => {
    if (req.body.password === process.env.APP_PASSWORD) {
        const token = jwt.sign({ loggedIn: true }, process.env.SESSION_SECRET, { expiresIn: '7d' });
        res.cookie('authToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
        });
        res.redirect(`${basePath}/`);
    } else {
        res.render('login', { error: 'Contraseña incorrecta.' });
    }
});
app.get(`${basePath}/logout`, (req, res) => {
    res.clearCookie('authToken');
    res.redirect(`${basePath}/login`);
});

// Ruta principal y de subida
app.get(`${basePath}/` || '/', requireLogin, (req, res) => res.render('index', { error: null }));
app.post(`${basePath}/upload`, requireLogin, upload.single('ticketImage'), async (req, res) => {
    if (!req.file) return res.status(400).render('index', { error: "No se ha subido ninguna imagen." });
    try {
        const prompt = process.env.GEMINI_PROMPT;
        const imagePart = { inlineData: { data: req.file.buffer.toString("base64"), mimeType: req.file.mimetype }};
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        let text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const ticketData = JSON.parse(text);
        res.render('edit', { ticket: ticketData });
    } catch (error) {
        console.error("Error procesando la imagen:", error);
        res.render('index', { error: "Hubo un error al procesar la imagen." });
    }
});

// Ruta para guardar el ticket
app.post(`${basePath}/save`, requireLogin, async (req, res) => {
    try {
        const { establecimiento, fecha, ...productos } = req.body;
        const lineas = [];
        for (let i = 0; productos[`descripcion_${i}`] !== undefined; i++) {
            lineas.push({
                descripcion: productos[`descripcion_${i}`],
                unidades: parseFloat(productos[`unidades_${i}`]) || 0,
                precio_unitario: parseFloat(productos[`precio_unitario_${i}`].replace(',', '.')) || 0,
            });
        }
        const createdTicket = await base(process.env.AIRTABLE_TICKETS_TABLE).create([
            { fields: { 'Establecimiento': establecimiento, 'Fecha': fecha } }
        ]);
        const ticketId = createdTicket[0].id;
        const lineasFields = lineas.map(prod => ({
            fields: { 'Producto': prod.descripcion, 'Unidades': prod.unidades, 'Precio_Unitario': prod.precio_unitario, 'Ticket': [ticketId] }
        }));
        for (let i = 0; i < lineasFields.length; i += 10) {
            const chunk = lineasFields.slice(i, i + 10);
            await base(process.env.AIRTABLE_LINES_TABLE).create(chunk);
        }
        res.redirect(`${basePath}/tickets`);
    } catch (error) {
        console.error("Error guardando en Airtable:", error);
        res.status(500).send("Error al guardar el ticket.");
    }
});

// Ruta para ver detalle de un ticket
app.get(`${basePath}/ticket/:id`, requireLogin, async (req, res) => {
    try {
        const ticket = await base(process.env.AIRTABLE_TICKETS_TABLE).find(req.params.id);
        const lineas_ticket = [];
        if (ticket.get('Productos')) {
            const lineasPromises = ticket.get('Productos').map(id => base(process.env.AIRTABLE_LINES_TABLE).find(id));
            const resolvedLineas = await Promise.all(lineasPromises);
            resolvedLineas.forEach(linea => lineas_ticket.push(linea.fields));
        }
        res.render('ticket-detail', { ticket: { id: ticket.id, ...ticket.fields }, productos: lineas_ticket });
    } catch (error) {
        console.error("Error al obtener el detalle del ticket:", error);
        res.status(404).send("Ticket no encontrado.");
    }
});

// Ruta para ver todos los tickets
app.get(`${basePath}/tickets`, requireLogin, async (req, res) => {
    try {
        const tickets = await base(process.env.AIRTABLE_TICKETS_TABLE).select({
            sort: [{ field: "Fecha", direction: "desc" }]
        }).all();
        res.render('tickets', { tickets: tickets });
    } catch (err) {
        console.error("Error al obtener los tickets:", err);
        res.status(500).send("Error al obtener los tickets de Airtable.");
    }
});

// 5. Iniciar Servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor escuchando en el puerto ${PORT}`);
});