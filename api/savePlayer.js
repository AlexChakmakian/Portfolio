const { TableClient, AzureNamedKeyCredential } = require("@azure/data-tables");

const accountName = process.env.STORAGE_ACCOUNT_NAME;
const accountKey = process.env.STORAGE_ACCOUNT_KEY;
const tableName = "Players";

module.exports = async function (context, req) {
    const { name, moves } = req.body;

    if (!name || !moves) {
        context.res = {
            status: 400,
            body: "Missing name or moves"
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
        body: { message: "Player saved!" }
    };
};
