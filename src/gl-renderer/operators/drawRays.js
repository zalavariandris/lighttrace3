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
    raysColor=[0.9,0.5,0.0,0.3]
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
            #define MAX_RAYMARCH_STEPS 9
            #define MIN_HIT_DISTANCE 1.0
            #define MAX_TRACE_DISTANCE 250.0

            attribute float vertexIdx;
            uniform sampler2D raysTexture;
            uniform vec2 raysTextureResolution;
            uniform float raysLength;
            
            uniform vec2 outputResolution;
            uniform mat4 projection;

            float modI(float a,float b)
            {
                float m = a-floor((a+0.5)/b)*b;
                return floor(m+0.5);
            }

            void main()
            {

                // sample data texture by index
                float lineIdx = floor(vertexIdx/2.0);
                float pixelX = mod(lineIdx, raysTextureResolution.x);
                float pixelY = floor(lineIdx / raysTextureResolution.x);
                vec2 texCoords = (vec2(pixelX, pixelY) + 0.5) / raysTextureResolution;

                // Unpack ray
                vec2 rayOrigin = texture2D(raysTexture, texCoords).xy;
                vec2 rayDirection = texture2D(raysTexture, texCoords).zw;
                bool IsLineStartPoint = modI(vertexIdx, 2.0) < 1.0;

                if(IsLineStartPoint)
                {
                    // map world position to screen
                    gl_Position = projection * vec4(rayOrigin, 0, 1);
    
                }
                else
                {
                    // map world position to screen
                    vec2 rayEnd = rayOrigin+rayDirection*raysLength;
                    gl_Position = projection * vec4(rayEnd, 0, 1);
                }
            }`,

        frag:`precision mediump float;
        uniform vec4 raysColor;
        void main()
        {
            gl_FragColor = vec4(raysColor);
        }`
    })();
}

export {drawRays}