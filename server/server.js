const app = require('./app');
const PORT = process.env.PORT || 3000;

// IMPORTED ROUTES
const userRoutes = require("./routes/user");

// ROUTES
app.use("/", userRoutes);

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
  });