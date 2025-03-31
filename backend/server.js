const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const ColorThief = require("colorthief");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("uploads"));

// MySQL Connection
const dbConfig = {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",  
    database: process.env.DB_NAME || "color_palette",
};

let db;
function handleDisconnect() {
    db = mysql.createConnection(dbConfig);
    db.connect(err => {
        if (err) {
            console.error("MySQL Connection Failed:", err);
            setTimeout(handleDisconnect, 5000);
        } else {
            console.log("✅ MySQL Connected...");
        }
    });

    db.on("error", err => {
        console.error("MySQL Error:", err);
        if (err.code === "PROTOCOL_CONNECTION_LOST") {
            console.log("🔄 Reconnecting to MySQL...");
            handleDisconnect();
        } else {
            throw err;
        }
    });
}
handleDisconnect(); 

// Multer Setup (For Image Uploads)
const storage = multer.diskStorage({
    destination: "./uploads/",
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Function to Classify Colors into Seasonal Palettes
const classifyPalette = (colors) => {
    const warmPalette = [[255, 165, 0], [255, 99, 71], [210, 105, 30], [139, 69, 19]];
    const winterPalette = [[0, 0, 128], [70, 130, 180], [100, 149, 237], [176, 224, 230]];
    const springPalette = [[255, 182, 193], [255, 239, 213], [152, 251, 152], [255, 255, 102]];
    const autumnPalette = [[165, 42, 42], [255, 140, 0], [210, 105, 30], [189, 183, 107]];
    
    let counts = { warm: 0, winter: 0, spring: 0, autumn: 0 };
    
    colors.forEach(color => {
        let minDist = Infinity;
        let assignedPalette = "";

        const palettes = { warm: warmPalette, winter: winterPalette, spring: springPalette, autumn: autumnPalette };
        
        for (const [paletteName, paletteColors] of Object.entries(palettes)) {
            for (const refColor of paletteColors) {
                const dist = Math.sqrt(
                    Math.pow(color[0] - refColor[0], 2) +
                    Math.pow(color[1] - refColor[1], 2) +
                    Math.pow(color[2] - refColor[2], 2)
                );
                if (dist < minDist) {
                    minDist = dist;
                    assignedPalette = paletteName;
                }
            }
        }
        counts[assignedPalette]++;
    });

    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
};

// API: Upload Image & Extract Colors
app.post("/upload", upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No image uploaded" });
        }

        const imagePath = path.join(__dirname, "uploads", req.file.filename);
        const colors = await ColorThief.getPalette(imagePath, 5);
        
        // Determine Seasonal Palette
        const recommendedPalette = classifyPalette(colors);
        
        // Save to Database
        const sql = "INSERT INTO palettes (image_name, colors, recommendations) VALUES (?, ?, ?)";
        db.query(sql, [req.file.filename, JSON.stringify(colors), recommendedPalette], (err, result) => {
            if (err) {
                console.error("Database Insert Error:", err);
                return res.status(500).json({ error: "Failed to save palette" });
            }
            res.json({ 
                message: "Palette saved!", 
                id: result.insertId, 
                colors, 
                recommendations: [{
                    palette_name: recommendedPalette,  
                    recommended: colors.map(rgb => `rgb(${rgb.join(",")})`)  
                }]
            });
        });

    } catch (error) {
        console.error("Color Extraction Error:", error);
        res.status(500).json({ error: "Failed to extract colors" });
    }
});

// API: Fetch Saved Palettes
app.get("/palettes", (req, res) => {
    db.query("SELECT * FROM palettes ORDER BY created_at DESC", (err, results) => {
        if (err) {
            console.error("Database Fetch Error:", err);
            return res.status(500).json({ error: "Failed to fetch palettes" });
        }
        res.json(results);
    });
});

// Start Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
