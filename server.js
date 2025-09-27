const express = require('express');
const app = express();
const port = 3000;

function highlightText(text, className) {
    return text
        .replace(/\[(.*?)\]\((.*?)\)/g, `<span class="${className}">[$1]($2)</span>`)
        .replace(/(?<!\[)(Gemini 2\.5 Pro|claude)(?!\])/g, `<span class="${className}">$&</span>`);
}

app.get('/', (req, res) => {
    const originalText = 'Check out [Gemini 2.5 Pro](https://ai.google.com/gemini) for details. Gemini 2.5 Pro is our current AI model.';
    const transformedText = 'Check out [claude](https://claude.com) for details. claude is our current AI model.';

    res.send(`
        <style>
            .original { background-color: #ffeeba; padding: 2px 4px; border-radius: 3px; }
            .transformed { background-color: #c3e6cb; padding: 2px 4px; border-radius: 3px; }
            .container { max-width: 800px; margin: 40px auto; padding: 20px; font-family: Arial, sans-serif; }
        </style>
        <div class="container">
            <h3>Original Text:</h3>
            <p>${highlightText(originalText, 'original')}</p>
            
            <h3>Transformed Text:</h3>
            <p>${highlightText(transformedText, 'transformed')}</p>
        </div>
    `);
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
