const { CosmosClient } = require("@azure/cosmos");

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const client = new CosmosClient({ endpoint, key });

const database = client.database("LeaderboardDB");
const container = database.container("Winners");

module.exports = async function (context, req) {
    const { name, moves } = req.body;
    const date = new Date().toISOString();

    if (!name || !moves) {
        context.res = {
            status: 400,
            body: "Missing name or moves"
        };
        return;
    }

    const entry = { name, date, moves };
    await container.items.create(entry);

    context.res = {
        status: 200,
        body: { message: "Winner submitted!", entry }
    };
};