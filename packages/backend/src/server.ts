import 'dotenv/config';
import app from './app';

const PORT = process.env.PORT || 5000;

import { logger } from './utils/logger';

app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
});
