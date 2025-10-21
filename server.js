// 1. Importaciones y Configuración
require('dotenv').config();
const express = require('express');
const path = require('path');
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
app.set('views', path.join(__dirname, 'views'));
// CORRECCIÓN: Servir archivos estáticos bajo la ruta base
app.use(basePath, express.static(path.join(__dirname, 'public')));
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
        const page = parseInt(req.query.page) || 1;
        const perPage = 10;
        const searchQuery = req.query.search || '';

        // 1. Obtener TODOS los tickets (solo metadata, sin productos - rápido)
        const allTickets = await base(process.env.AIRTABLE_TICKETS_TABLE).select({
            sort: [{ field: "Fecha", direction: "desc" }]
        }).all();

        // 2. Filtrar por búsqueda si existe
        let filteredTickets = allTickets;
        if (searchQuery.trim().length > 0) {
            const searchLower = searchQuery.toLowerCase();
            filteredTickets = allTickets.filter(ticket => {
                const establecimiento = (ticket.fields.Establecimiento || '').toLowerCase();
                const fecha = ticket.fields.Fecha || '';
                return establecimiento.includes(searchLower) || fecha.includes(searchLower);
            });
        }

        // 3. Calcular paginación
        const totalTickets = filteredTickets.length;
        const totalPages = Math.ceil(totalTickets / perPage);
        const startIndex = (page - 1) * perPage;
        const endIndex = startIndex + perPage;

        // 4. Obtener SOLO los tickets de la página actual
        const ticketsForPage = filteredTickets.slice(startIndex, endIndex);

        // 5. Calcular totales SOLO para los tickets de esta página
        const ticketsWithTotal = await Promise.all(ticketsForPage.map(async (ticket) => {
            let total = 0;
            if (ticket.fields.Productos && ticket.fields.Productos.length > 0) {
                const lineasPromises = ticket.fields.Productos.map(id =>
                    base(process.env.AIRTABLE_LINES_TABLE).find(id)
                );
                const lineas = await Promise.all(lineasPromises);
                total = lineas.reduce((sum, linea) => {
                    const unidades = linea.fields.Unidades || 0;
                    const precio = linea.fields.Precio_Unitario || 0;
                    return sum + (unidades * precio);
                }, 0);
            }
            return {
                ...ticket,
                total: total
            };
        }));

        res.render('tickets', {
            tickets: ticketsWithTotal,
            searchQuery: searchQuery,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalTickets: totalTickets,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    } catch (err) {
        console.error("Error al obtener los tickets:", err);
        res.status(500).send("Error al obtener los tickets de Airtable.");
    }
});

// Ruta de búsqueda de productos
app.get(`${basePath}/productos`, requireLogin, (req, res) => {
    res.render('productos');
});

// API de búsqueda de productos (AJAX)
app.get(`${basePath}/api/productos/buscar`, requireLogin, async (req, res) => {
    try {
        const query = req.query.q || '';

        if (query.length < 2) {
            return res.json({ resultados: [] });
        }

        // Buscar todas las líneas que coincidan con el producto
        const lineas = await base(process.env.AIRTABLE_LINES_TABLE).select({
            filterByFormula: `SEARCH(LOWER("${query.replace(/"/g, '\\"')}"), LOWER({Producto})) > 0`
        }).all();

        // Cache para evitar consultas duplicadas de tickets
        const ticketsCache = {};

        // Obtener información completa de cada línea con su ticket
        const resultados = await Promise.all(lineas.map(async (linea) => {
            const ticketId = linea.fields.Ticket ? linea.fields.Ticket[0] : null;

            if (!ticketId) return null;

            // Usar cache para evitar consultas duplicadas
            if (!ticketsCache[ticketId]) {
                ticketsCache[ticketId] = await base(process.env.AIRTABLE_TICKETS_TABLE).find(ticketId);
            }

            const ticket = ticketsCache[ticketId];

            return {
                producto: linea.fields.Producto || 'Sin nombre',
                fecha: ticket.fields.Fecha || null,
                precioUnitario: linea.fields.Precio_Unitario || 0,
                unidades: linea.fields.Unidades || 0,
                ticketId: ticketId,
                establecimiento: ticket.fields.Establecimiento || 'Sin establecimiento'
            };
        }));

        // Filtrar resultados nulos y ordenar por fecha descendente
        const resultadosFiltrados = resultados
            .filter(r => r !== null && r.fecha !== null)
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
            .slice(0, 15); // Límite de 15 resultados

        res.json({ resultados: resultadosFiltrados });
    } catch (err) {
        console.error("Error al buscar productos:", err);
        res.status(500).json({ error: "Error al buscar productos" });
    }
});

// 5. Iniciar Servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor escuchando en el puerto ${PORT}`);
});