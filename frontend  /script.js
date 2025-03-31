document.getElementById("extract-btn").addEventListener("click", async () => {
    const fileInput = document.getElementById("image-input");
    if (fileInput.files.length === 0) {
        alert("Please upload an image first!");
        return;
    }

    const formData = new FormData();
    formData.append("image", fileInput.files[0]);

    try {
        const response = await fetch("http://localhost:5001/upload", {
            method: "POST",
            body: formData
        });

        const result = await response.json();
        if (result.error) {
            alert(result.error);
            return;
        }

        const colorPaletteDiv = document.getElementById("color-palette");
        colorPaletteDiv.innerHTML = ""; 

        // ✅ Display Suggested Palette Name
        if (result.recommendations.length > 0) {
            const paletteName = document.createElement("h3");
            paletteName.textContent = `Suggested Palette: ${result.recommendations[0].palette_name}`;
            paletteName.style.color = "#6a0dad"; 
            paletteName.style.marginBottom = "10px";
            colorPaletteDiv.appendChild(paletteName);
        }

        // ✅ Display Extracted Colors
        result.recommendations[0].recommended.forEach(colorCode => {
            const colorBox = document.createElement("div");
            colorBox.style.backgroundColor = colorCode;
            colorBox.style.width = "50px";
            colorBox.style.height = "50px";
            colorBox.style.margin = "5px";
            colorBox.style.display = "inline-block";
            colorBox.style.borderRadius = "5px";
            colorPaletteDiv.appendChild(colorBox);
        });

    } catch (error) {
        console.error("Error extracting colors:", error);
    }
});
