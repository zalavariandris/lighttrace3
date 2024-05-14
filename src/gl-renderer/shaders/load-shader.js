function resolveShader(shaderText)
{
    return shaderText;
    shaderText.split("\n").map(line=>{
        return line
    }).join("\n");
}

async function loadShader(shader_path) {
    try {
        const response = await fetch(shader_path);
        const shaderText = await response.text();

        return resolveShader(shaderText);
    } catch (err) {
        console.error(err);
    }
}

export {loadShader}