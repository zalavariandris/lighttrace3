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
function drawLinesBetweenPoints(regl, {
    linesCount,
    startpoints,
    endpoints,
    colors,
    outputResolution,
    viewport,
    framebuffer=null
}={})
{
    const projection = mat4.create();
    mat4.ortho(projection, viewport.x, viewport.x+viewport.width,viewport.y,viewport.y+viewport.height,-1.0, 1.0);
    regl({
        framebuffer,
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
            uniform sampler2D startpointsTexture;
            uniform vec2 startpointsResolution;
            uniform sampler2D endpointsTexture;
            uniform vec2 endpointsResolution;
            uniform sampler2D colorsTexture;
            uniform vec2 colorsResolution; 
            uniform mat4 projection;

            attribute float vertexIdx;

            varying vec4 vColor;
            
            vec4 texelFetchByIdx(sampler2D texture, vec2 resolution, float texelIdx)
            {
                float pixelX = mod(texelIdx, resolution.x);
                float pixelY = floor(texelIdx / resolution.x);
                vec2 texCoords = (vec2(pixelX, pixelY) + 0.5) / resolution;
                return texture2D(texture, texCoords);
            }

            void main()
            {
                float lineIdx = floor(vertexIdx/2.0);

                // Set vertex position
                bool IsLineStartPoint = mod(vertexIdx, 2.0) < 1.0;
                vec2 startPoint = texelFetchByIdx(startpointsTexture, startpointsResolution, lineIdx).xy;
                vec2 endPoint = texelFetchByIdx(endpointsTexture, endpointsResolution, lineIdx).xy;
                if(IsLineStartPoint)
                {
                    
                    gl_Position = projection * vec4(startPoint, 0.0, 1.0);
                }
                else
                {
                    
                    gl_Position = projection * vec4(endPoint, 0.0, 1.0);
                }

                // rasterization bias
                vec2 dir = endPoint-startPoint;
                float biasCorrection = clamp(length(dir)/max(abs(dir.x), abs(dir.y)), 1.0, 1.414214);
                // vec2 dir = endPoint-startPoint;
                // float bias = length(V) / max(abs(V.x),abs(V.y));

                // set vertex colors
                vColor = vec4(1,1,1,1);//texelFetchByIdx(colorsTexture, colorsResolution, lineIdx).rgba * vec4(biasCorrection,biasCorrection,biasCorrection,1);
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

function drawLineSegments(regl, {
    linesCount,
    lineSegments,
    color,
    outputResolution,
    viewport,
    framebuffer=null
}={})
{
    const projection = mat4.create();
    mat4.ortho(projection, viewport.x, viewport.x+viewport.width,viewport.y,viewport.y+viewport.height,-1.0, 1.0);
    regl({
        framebuffer,
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
            lineSegmetsTexture: lineSegments,
            lineSegmetsResolution: [lineSegments.width, lineSegments.height],
            color: color,
            projection: projection
        },
        vert: `precision mediump float;
            uniform sampler2D lineSegmetsTexture;
            uniform vec2 lineSegmetsResolution;
            uniform vec4 color;
            uniform vec2 colorsResolution; 
            uniform mat4 projection;

            attribute float vertexIdx;

            varying vec4 vColor;
            
            vec4 texelFetchByIdx(sampler2D texture, vec2 resolution, float texelIdx)
            {
                float pixelX = mod(texelIdx, resolution.x);
                float pixelY = floor(texelIdx / resolution.x);
                vec2 texCoords = (vec2(pixelX, pixelY) + 0.5) / resolution;
                return texture2D(texture, texCoords);
            }

            void main()
            {
                float lineIdx = floor(vertexIdx/2.0);

                // Set vertex position
                bool IsLineStartPoint = mod(vertexIdx, 2.0) < 1.0;
                vec4 lineSegment = texelFetchByIdx(lineSegmetsTexture, lineSegmetsResolution, lineIdx);
                vec2 startPoint = lineSegment.xy;
                vec2 endPoint = lineSegment.zw;

                if(IsLineStartPoint)
                {
                    gl_Position = projection * vec4(startPoint, 0.0, 1.0);
                }
                else
                {
                    
                    gl_Position = projection * vec4(endPoint, 0.0, 1.0);
                }

                // rasterization bias
                vec2 dir = endPoint-startPoint;
                float biasCorrection = clamp(length(dir)/max(abs(dir.x), abs(dir.y)), 1.0, 1.414214);
                // vec2 dir = endPoint-startPoint;
                // float bias = length(V) / max(abs(V.x),abs(V.y));

                // set vertex colors

                vColor = color;
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

export {drawLineSegments, drawLinesBetweenPoints}