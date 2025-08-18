    exports.handler = async (event, context) => {
        // Access query parameters
        const name = event.queryStringParameters?.name || 'world';

        return {
            statusCode: 200,
            body: JSON.stringify({ message: `Hello, ${name}!` }),
        };
    };