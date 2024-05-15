import _ from "lodash"
import {glMatrix, mat4} from "gl-matrix"

window.glMatrix = glMatrix;
window.mat4 = mat4;
/**
* Draw rays based on rayDataTexture and hitDataTexture
* 
* @param {int} params.linesCount - umber of lines to draw
* @param {Texture} params.startpoints - Texture containing startpoints XY data in RedGreen channels
* @param {Texture} params.endpoints - exture containing endpoints XY data in RedGreen channels
* @param {[Array]} params.outputResolution - Resolution of the output [width, height].
* @param {[R,G,B,A]} params.linesColor - the bas color of all lines
*/
function drawLines(regl, {
    linesCount,
    startpoints,
    endpoints,
    colors,
    outputResolution,
    viewport,
    linesColor=[0.9,0.5,0.0,0.3]
}={})
{
    const projection = mat4.create();
    mat4.ortho(projection, viewport.x, viewport.x+viewport.width,viewport.y,viewport.y+viewport.height,-1.0, 1.0);
    // mat4.ortho(projection,0, outputResolution[0], 0, outputResolution[1], -1.0, 1.0);
    regl({
        viewport: {
            x: 0,
            y: 0,
            width: outputResolution[0],
            height: outputResolution[1]
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

        primitive: "lines",
        attributes: {
            vertexIdx: _.range(linesCount*2),
        },
        count: linesCount*2,
        uniforms:{
            startpointsTexture: startpoints,
            startpointsResolution: [startpoints.width, startpoints.height],
            endpointsTexture: endpoints,
            endpointsResolution: [endpoints.width, endpoints.height],
            colorsTexture: colors,
            colorsResolution: [colors.width, colors.height],
            projection: projection
        },
        vert: `precision mediump float;
            #define MAX_RAYMARCH_STEPS 9
            #define MIN_HIT_DISTANCE 1.0
            #define MAX_TRACE_DISTANCE 250.0

            attribute float vertexIdx;
            uniform sampler2D startpointsTexture;
            uniform vec2 startpointsResolution;
            uniform sampler2D endpointsTexture;
            uniform vec2 endpointsResolution;
            uniform sampler2D colorsTexture;
            uniform vec2 colorsResolution; 
            uniform mat4 projection;

            varying vec4 vColor;
            

            float modI(float a,float b)
            {
                float m = a-floor((a+0.5)/b)*b;
                return floor(m+0.5);
            }

            void main()
            {
                float lineIdx = floor(vertexIdx/2.0);

                // Unpack colors
                float pixelX = mod(lineIdx, colorsResolution.x);
                float pixelY = floor(lineIdx / colorsResolution.x);
                vec2 texCoords = (vec2(pixelX, pixelY) + 0.5) / colorsResolution;
                vColor = texture2D(colorsTexture, texCoords).rgba;

                bool IsLineStartPoint = modI(vertexIdx, 2.0) < 1.0;
                if(IsLineStartPoint)
                {
                    // Unpack startpoint
                    float pixelX = mod(lineIdx, startpointsResolution.x);
                    float pixelY = floor(lineIdx / startpointsResolution.x);
                    vec2 texCoords = (vec2(pixelX, pixelY) + 0.5) / startpointsResolution;
                    vec2 startPoint = texture2D(startpointsTexture, texCoords).xy;

                    // map world position to screen
                    gl_Position = projection * vec4(startPoint, 0.0, 1.0);
                }
                else
                {
                    // Unpack endpoint
                    float pixelX = mod(lineIdx, endpointsResolution.x);
                    float pixelY = floor(lineIdx / endpointsResolution.x);
                    vec2 texCoords = (vec2(pixelX, pixelY) + 0.5) / endpointsResolution;
                    vec2 endPoint = texture2D(endpointsTexture, texCoords).xy;

                    // map world position to screen
                    gl_Position = projection * vec4(endPoint, 0.0, 1.0);
                }
            }`,

        frag:`precision mediump float;
        uniform vec4 lineColor;
        varying vec4 vColor;
        void main()
        {
            gl_FragColor = vColor;
        }`
    })();
}

export {drawLines}