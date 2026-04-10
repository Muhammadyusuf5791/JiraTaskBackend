const jwt = require("jsonwebtoken");

module.exports = async (req, res, next) => {
    console.log("Auth middleware ishlayapti...");
    
    try {
        const authHeader = req.headers.authorization;

        if(!authHeader) {
            console.log("Authorization header yo'q");
            return res.status(401).json({ 
                success: false,
                message: "Token taqdim etilmagan" 
            });
        }

        // "Bearer " qismini olib tashlash
        const token = authHeader.split(" ")[1];

        if (!token) {
            console.log("Token yo'q");
            return res.status(401).json({ 
                success: false,
                message: "Token taqdim etilmagan" 
            });
        }

        console.log("Token bor:", token.substring(0, 20) + "...");

        // Tokenni dekodlash (faqat dekodlash, database tekshirmasdan)
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'uzbek2025');
        
        console.log("Decoded token:", decoded);

        // Test uchun user ma'lumotlari
        req.user = {
            id: decoded.id || 1,
            fullName: decoded.fullName || "Test Admin",
            phone: decoded.phone || "998901234567",
            role: decoded.role || "Admin",
            createdAt: new Date()
        };

        console.log(`Auth muvaffaqiyatli: ${req.user.fullName} (${req.user.role})`);
        next();

    } catch (error) {
        console.error("Auth xatosi:", error.message);
        
        if (error.name === 'JsonWebTokenError') {
            console.log("JWT xatosi:", error.message);
            return res.status(401).json({ 
                success: false,
                message: "Noto'g'ri token" 
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false,
                message: "Token muddati tugagan" 
            });
        }

        console.error("Boshqa xato:", error);
        return res.status(500).json({ 
            success: false,
            message: "Server xatosi" 
        });
    }
};