import prisma from '../src/lib/prisma';

async function inspectIndexes() {
  const indexes: any = await prisma.$queryRawUnsafe(`
    SELECT indexname, indexdef 
    FROM pg_indexes 
    WHERE tablename = 'classes';
  `);
  console.log('Indexes on "classes":', indexes);

  const constraints: any = await prisma.$queryRawUnsafe(`
    SELECT conname, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE conrelid = 'classes'::regclass;
  `);
  console.log('Constraints on "classes":', constraints);
}

inspectIndexes()
  .catch((err) => console.error(err))
  .finally(async () => await prisma.$disconnect());
