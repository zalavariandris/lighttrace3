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
        if(!response.ok){
            throw new Error(`${response.url} ${response.status} ${response.statusText}`);
        }
        const shaderText = await response.text();

        return resolveShader(shaderText);
    } catch (err) {
        console.error(err);
    }
}

export {loadShader}