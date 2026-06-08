const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.post.findUnique({
  where: { id: '2ecf5768-8788-48e8-9566-2416d8d24061' },
  include: { brolls: true }
}).then(res => {
  console.log("Post in DB:", res);
  p.$disconnect();
});
