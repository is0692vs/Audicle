
import { logger } from '../logger';

describe('logger', () => {
  const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    consoleLogSpy.mockClear();
    consoleWarnSpy.mockClear();
    consoleErrorSpy.mockClear();
  });

  it('should call console.log with the correct format for info', () => {
    logger.info('Test message', { data: 'test' });
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '%c[Audicle] [INFO]',
      'color: #3b82f6; font-weight: bold',
      'Test message',
      { data: 'test' }
    );
  });

  it('should call console.log with the correct format for success', () => {
    logger.success('Test message', 'another param');
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '%c[Audicle] [SUCCESS]',
      'color: #10b981; font-weight: bold',
      'Test message',
      'another param'
    );
  });

  it('should call console.warn with the correct format for warn', () => {
    logger.warn('Test message');
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '%c[Audicle] [WARN]',
      'color: #f59e0b; font-weight: bold',
      'Test message'
    );
  });

  it('should call console.error with the correct format for error', () => {
    logger.error('Test message');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '%c[Audicle] [ERROR]',
      'color: #ef4444; font-weight: bold',
      'Test message'
    );
  });

  it('should call console.log twice for data', () => {
    const testData = { key: 'value' };
    logger.data('Test message', testData);
    expect(consoleLogSpy).toHaveBeenCalledTimes(2);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '%c[Audicle] [DATA]',
      'color: #8b5cf6; font-weight: bold',
      'Test message'
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(testData);
  });

  it('should call console.log for apiRequest without data', () => {
    logger.apiRequest('GET', '/api/test');
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '%c[Audicle] [API →]',
      'color: #3b82f6; font-weight: bold',
      'GET /api/test'
    );
  });

  it('should call console.log twice for apiRequest with data', () => {
    const testData = { id: 1 };
    logger.apiRequest('POST', '/api/test', testData);
    expect(consoleLogSpy).toHaveBeenCalledTimes(2);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '%c[Audicle] [API →]',
      'color: #3b82f6; font-weight: bold',
      'POST /api/test'
    );
    expect(consoleLogSpy).toHaveBeenCalledWith('Request data:', testData);
  });

  it('should call console.log twice for apiResponse', () => {
    const responseData = { status: 'ok' };
    logger.apiResponse('/api/test', responseData);
    expect(consoleLogSpy).toHaveBeenCalledTimes(2);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '%c[Audicle] [API ←]',
      'color: #10b981; font-weight: bold',
      '/api/test'
    );
    expect(consoleLogSpy).toHaveBeenCalledWith('Response data:', responseData);
  });

  it('should call console.log for cache', () => {
    logger.cache('HIT', 'my-cache-key');
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '%c[Audicle] [CACHE]',
      'color: #8b5cf6; font-weight: bold',
      'HIT: my-cache-key'
    );
  });

  it('should call console.log for pending', () => {
    logger.pending('Loading data...');
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '%c[Audicle] [PENDING]',
      'color: #8b5cf6; font-weight: bold',
      'Loading data...'
    );
  });
});
