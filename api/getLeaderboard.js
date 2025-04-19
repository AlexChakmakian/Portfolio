const { TableClient, AzureNamedKeyCredential } = require("@azure/data-tables");

const accountName = process.env.STORAGE_ACCOUNT_NAME;
const accountKey = process.env.STORAGE_ACCOUNT_KEY;
const tableName = "Players";

module.exports = async function (context, req) {
    const credential = new AzureNamedKeyCredential(accountName, accountKey);
    const client = new TableClient(`https://${accountName}.table.core.windows.net`, tableName, credential);

    const players = [];

    for await (const entity of client.listEntities()) {
        players.push({
            name: entity.name,
            moves: entity.moves,
            timestamp: entity.rowKey // Using rowKey as timestamp
        });
    }

    players.sort((a, b) => a.moves - b.moves);
    const top10 = players.slice(0, 10);

    context.res = {
        status: 200,
        body: top10
    };
};
