const {publicIP} = require('../server/request-network.cjs');

// Diagnóstico na Vercel: não usar esta rota como autorização de rede.
module.exports = function network(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({error: 'Método não permitido.'});
  }
  const ip = publicIP(req.headers);
  if (!ip) return res.status(503).json({error: 'IP público indisponível.'});
  return res.status(200).json({ip});
};
