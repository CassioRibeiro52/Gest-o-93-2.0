import { execSync } from 'child_process';
execSync('git checkout -- components services src/components src/services', { stdio: 'inherit' });
