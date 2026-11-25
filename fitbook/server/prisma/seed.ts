import { runSeed } from '../src/utils/seedData';

runSeed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
