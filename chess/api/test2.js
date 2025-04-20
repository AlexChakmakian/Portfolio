const { TableClient, AzureNamedKeyCredential } = require("@azure/data-tables");

const accountName = process.env.STORAGE_ACCOUNT_NAME;
const accountKey = process.env.STORAGE_ACCOUNT_KEY;
const tableName = "Players";

module.exports = async function (context, req) {
    const headers = {
        "Access-Control-Allow-Origin": req.headers.origin || "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Content-Type": "application/json"
    };

    if (req.method === "OPTIONS") {
        context.res = { status: 204, headers };
        return;
    }

    try {
        const credential = new AzureNamedKeyCredential(accountName, accountKey);
        const client = new TableClient(`https://${accountName}.table.core.windows.net`, tableName, credential);

        const players = [];
        for await (const entity of client.listEntities()) {
            players.push({
                name: entity.name,
                moves: entity.moves,
                timestamp: entity.rowKey
            });
        }

        players.sort((a, b) => a.moves - b.moves);
        context.res = {
            status: 200,
            headers,
            body: players.slice(0, 10)
        };
    } catch (err) {
        context.res = {
            status: 500,
            headers,
            body: { error: err.message }
        };
    }
};
