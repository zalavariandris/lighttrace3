import _ from "lodash"
/**
* Draw rays based on rayDataTexture and hitDataTexture
* 
* @param {int} params.linesCount - umber of lines to draw
* @param {Texture} params.raysTexture - Texture containing Rays. RG channels for origin and BA channels for direction
* @param {float} params.rayLength - tha rays drawing length
* @param {[Array]} params.outputResolution - Resolution of the output [width, height].
*/
function drawRays(regl, {
    raysCount,
    raysTexture,
    raysLength,
    outputResolution,
    viewport,
    raysColor=[0.9,0.5,0.0,0.3],
    framebuffer=null
}={})
{
    const projection = mat4.create();
    mat4.ortho(projection, viewport.x, viewport.x+viewport.width,viewport.y,viewport.y+viewport.height,-1.0, 1.0);
    regl({
        viewport: {
            x: 0,
            y: 0,
            width: outputResolution[0],
            height: outputResolution[1]
        },
        primitive: "lines",
        attributes: {
            vertexIdx: _.range(raysCount*2),
        },
        count: raysCount*2,
        uniforms:{
            raysTexture: raysTexture,
            raysTextureResolution: [raysTexture.width, raysTexture.height],
            raysLength: raysLength,
            outputResolution: outputResolution,
            raysColor: raysColor,
            projection: projection
        },
        depth: { enable: false },
        blend: {
            enable: true,
            func: {
                srcRGB: 'src alpha',
                dstRGB: 'one',
                srcAlpha: 'src alpha',
                dstAlpha: 'one',
            }
        },
        vert: `precision mediump float;
            attribute float vertexIdx;
            uniform sampler2D raysTexture;
            uniform vec2 raysTextureResolution;
            uniform float raysLength;
            
            uniform vec2 outputResolution;
            uniform mat4 projection;

            /* Sample data texture by index*/
            vec4 texelFetchByIdx(sampler2D texture, vec2 resolution, float texelIdx)
            {
                /* sample texture at pixel centers */
                float pixelX = mod(texelIdx, resolution.x);
                float pixelY = floor(texelIdx / resolution.x);
                vec2 texCoords = (vec2(pixelX, pixelY) + 0.5) / resolution;
                return texture2D(texture, texCoords);
            }

            void main()
            {
                // Sample data texture by index
                float lineIdx = floor(vertexIdx/2.0);
                vec4 rayData = texelFetchByIdx(raysTexture, raysTextureResolution, lineIdx);

                // Unpack ray
                vec2 rayOrigin = rayData.xy;
                vec2 rayDirection = rayData.zw;

                // Set vertex position
                bool IsLineStartPoint = mod(vertexIdx, 2.0) < 1.0;
                if(IsLineStartPoint)
                {
                    gl_Position = projection * vec4(rayOrigin, 0, 1);
                }
                else
                {
                    vec2 rayEnd = rayOrigin+rayDirection*raysLength;
                    gl_Position = projection * vec4(rayEnd, 0, 1);
                }
            }`,

        frag:`precision mediump float;
            uniform vec4 raysColor;
            void main()
            {
                gl_FragColor = vec4(raysColor.rgb, 1.0);
            }`
    })();
}

export {drawRays}