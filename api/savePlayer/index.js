const { TableClient, AzureNamedKeyCredential } = require("@azure/data-tables");

const accountName = process.env.STORAGE_ACCOUNT_NAME;
const accountKey = process.env.STORAGE_ACCOUNT_KEY;
const tableName = "Players";

const headers = {
    "Access-Control-Allow-Origin": "https://alexjacob.dev",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Origin, Accept",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin", // ✅ Recommended to prevent caching issues
    "Content-Type": "application/json"
};

module.exports = async function (context, req) {
    context.log("SavePlayer function triggered");

    // ✅ Proper preflight CORS response
    if (req.method === "OPTIONS") {
        context.res = {
            status: 204,
            headers: headers,
            body: ""
        };
        return;
    }

    try {
        const { name, moves } = req.body;

        if (!name || !moves) {
            context.res = {
                status: 400,
                headers: headers,
                body: { error: "Missing required fields: name or moves" }
            };
            return;
        }

        if (!accountName || !accountKey) {
            context.res = {
                status: 500,
                headers: headers,
                body: { error: "Server configuration error: Missing storage credentials" }
            };
            return;
        }

        const credential = new AzureNamedKeyCredential(accountName, accountKey);
        const client = new TableClient(`https://${accountName}.table.core.windows.net`, tableName, credential);

        const entity = {
            partitionKey: "Players",
            rowKey: Date.now().toString(),
            name,
            moves
        };

        await client.createEntity(entity);

        context.res = {
            status: 200,
            headers: headers,
            body: { message: "Player saved successfully!", name, moves }
        };
    } catch (error) {
        context.res = {
            status: 500,
            headers: headers,
            body: {
                error: "Failed to save player data",
                details: error.message
            }
        };
    }
};
