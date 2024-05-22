const QUAD = {
    primitive: "triangle fan",
    attributes: {
        position: [
            [-1,-1],
            [ 1,-1],
            [ 1, 1],
            [-1, 1]
        ],
        uv: [
            [ 0, 0],
            [ 1, 0],
            [ 1, 1],
            [ 0, 1]
        ]
    },
    count: 4
};

export default QUAD;