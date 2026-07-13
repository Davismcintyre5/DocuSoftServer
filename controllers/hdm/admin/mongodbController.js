const mongoose = require('mongoose');

// ============ HELPERS ============
const getAdminDb = () => mongoose.connection.db;

// ============ STATS ============
exports.getStats = async (req, res) => {
  try {
    const db = getAdminDb();
    const [serverStatus, dbStats] = await Promise.all([
      db.admin().serverStatus(),
      db.stats(),
    ]);

    const dbNames = process.env.MONGODB_DATABASES
      ? process.env.MONGODB_DATABASES.split(',').map(n => n.trim()).filter(Boolean)
      : [];

    let totalDataSize = 0;
    let totalStorageSize = 0;
    let totalIndexSize = 0;
    let totalCollections = 0;
    let totalObjects = 0;

    for (const name of dbNames) {
      try {
        const targetDb = mongoose.connection.client.db(name);
        const stats = await targetDb.stats().catch(() => ({}));
        totalDataSize += stats.dataSize || 0;
        totalStorageSize += stats.storageSize || 0;
        totalIndexSize += stats.indexSize || 0;
        totalCollections += stats.collections || 0;
        totalObjects += stats.objects || 0;
      } catch {}
    }

    const tier = process.env.MONGODB_TIER || 'M0';
    const limitMB = parseInt(process.env.MONGODB_STORAGE_LIMIT_MB) || 512;
    const storageLimit = limitMB * 1024 * 1024;
    const usedPercent = parseFloat(((totalStorageSize / storageLimit) * 100).toFixed(2));

    res.json({
      success: true,
      data: {
        version: serverStatus.version,
        uptime: serverStatus.uptime,
        connections: serverStatus.connections,
        tier,
        storage: {
          used: totalStorageSize,
          usedFormatted: (totalStorageSize / 1024 / 1024).toFixed(1) + ' MB',
          limit: storageLimit,
          limitFormatted: (storageLimit / 1024 / 1024).toFixed(0) + ' MB',
          usedPercent,
          dataSize: totalDataSize,
          storageSize: totalStorageSize,
          indexSize: totalIndexSize,
          collections: totalCollections,
          objects: totalObjects,
        },
        host: serverStatus.host,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ DATABASES ============
exports.getDatabases = async (req, res) => {
  try {
    const dbNames = process.env.MONGODB_DATABASES
      ? process.env.MONGODB_DATABASES.split(',').map(n => n.trim()).filter(Boolean)
      : [];

    const enriched = await Promise.all(
      dbNames.map(async (name) => {
        try {
          const db = mongoose.connection.client.db(name);
          const cols = await db.listCollections().toArray();
          const stats = await db.stats().catch(() => ({}));
          return {
            name,
            collections: cols.length,
            dataSize: stats.dataSize || 0,
            storageSize: stats.storageSize || 0,
            indexSize: stats.indexSize || 0,
            objects: stats.objects || 0,
          };
        } catch {
          return { name, collections: 0, dataSize: 0, storageSize: 0 };
        }
      })
    );

    res.json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ COLLECTIONS IN DB ============
exports.getCollections = async (req, res) => {
  try {
    const dbName = req.params.db;
    const db = mongoose.connection.client.db(dbName);
    const cols = await db.listCollections().toArray();

    const enriched = await Promise.all(
      cols.map(async (c) => {
        const stats = await db.command({ collStats: c.name }).catch(() => ({}));
        return {
          name: c.name,
          type: c.type,
          documentCount: stats.count || 0,
          size: stats.size || 0,
          avgObjSize: stats.avgObjSize || 0,
          indexes: stats.nindexes || 0,
        };
      })
    );

    res.json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ COLLECTION DETAILS ============
exports.getCollection = async (req, res) => {
  try {
    const { db: dbName, col } = req.params;
    const db = mongoose.connection.client.db(dbName);
    const collection = db.collection(col);

    const [stats, sample, indexes] = await Promise.all([
      db.command({ collStats: col }).catch(() => ({})),
      collection.find({}).limit(20).toArray(),
      collection.indexes().catch(() => []),
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          count: stats.count || 0,
          size: stats.size || 0,
          avgObjSize: stats.avgObjSize || 0,
          storageSize: stats.storageSize || 0,
          indexes: stats.nindexes || 0,
        },
        indexes,
        sampleDocuments: sample,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ QUERY ============
exports.queryCollection = async (req, res) => {
  try {
    const { db: dbName, col } = req.params;
    const filter = req.query.filter ? JSON.parse(req.query.filter) : {};
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;
    const sort = req.query.sort ? JSON.parse(req.query.sort) : { _id: -1 };

    const db = mongoose.connection.client.db(dbName);
    const collection = db.collection(col);

    const [docs, total] = await Promise.all([
      collection.find(filter).sort(sort).skip(skip).limit(limit).toArray(),
      collection.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        documents: docs,
        total,
        limit,
        skip,
        filter,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ DROP COLLECTION ============
exports.dropCollection = async (req, res) => {
  try {
    const { db: dbName, col } = req.params;
    const db = mongoose.connection.client.db(dbName);
    await db.collection(col).drop();
    res.json({ success: true, message: `Dropped ${dbName}.${col}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ DROP DATABASE ============
exports.dropDatabase = async (req, res) => {
  try {
    const dbName = req.params.db;
    const db = mongoose.connection.client.db(dbName);
    await db.dropDatabase();
    res.json({ success: true, message: `Dropped database: ${dbName}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};