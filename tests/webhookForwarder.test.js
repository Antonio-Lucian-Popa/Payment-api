/**
 * TESTE - WEBHOOK FORWARDER
 * =========================
 * Testează logica de retransmitere a evenimentelor (fără rețea reală).
 */

const crypto = require('crypto');

describe('webhookForwarder', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    delete process.env.WEBHOOK_FORWARD_URL;
    delete process.env.WEBHOOK_FORWARD_SECRET;
    delete process.env.WEBHOOK_FORWARD_EVENTS;
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('isEnabled este false fără URL configurat', () => {
    const fwd = require('../src/services/webhookForwarder');
    expect(fwd.isEnabled()).toBe(false);
  });

  it('isEnabled este true cu URL configurat', () => {
    process.env.WEBHOOK_FORWARD_URL = 'https://app.ro/hook';
    const fwd = require('../src/services/webhookForwarder');
    expect(fwd.isEnabled()).toBe(true);
  });

  it('shouldForward respectă filtrul de evenimente', () => {
    process.env.WEBHOOK_FORWARD_EVENTS = 'checkout.session.completed,invoice.paid';
    const fwd = require('../src/services/webhookForwarder');
    expect(fwd.shouldForward('checkout.session.completed')).toBe(true);
    expect(fwd.shouldForward('charge.failed')).toBe(false);
  });

  it('shouldForward acceptă tot când filtrul e gol', () => {
    const fwd = require('../src/services/webhookForwarder');
    expect(fwd.shouldForward('orice.event')).toBe(true);
  });

  it('sign returnează null fără secret și HMAC valid cu secret', () => {
    let fwd = require('../src/services/webhookForwarder');
    expect(fwd.sign('payload')).toBeNull();

    jest.resetModules();
    process.env.WEBHOOK_FORWARD_SECRET = 'sup3rsecret';
    fwd = require('../src/services/webhookForwarder');
    const expected =
      'sha256=' + crypto.createHmac('sha256', 'sup3rsecret').update('payload').digest('hex');
    expect(fwd.sign('payload')).toBe(expected);
  });

  it('forwardEvent trimite POST cu headerele corecte către destinație', async () => {
    process.env.WEBHOOK_FORWARD_URL = 'https://app.ro/hook';
    process.env.WEBHOOK_FORWARD_SECRET = 'sup3rsecret';

    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock;

    const fwd = require('../src/services/webhookForwarder');
    fwd.forwardEvent({
      id: 'evt_123',
      type: 'checkout.session.completed',
      created: 1690000000,
      data: { object: { id: 'cs_1' } },
    });

    // fire-and-forget: lăsăm microtask-urile să ruleze
    await new Promise((r) => setImmediate(r));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('https://app.ro/hook');
    expect(opts.method).toBe('POST');
    expect(opts.headers['x-payment-event']).toBe('checkout.session.completed');
    expect(opts.headers['x-payment-event-id']).toBe('evt_123');
    expect(opts.headers['x-payment-signature']).toMatch(/^sha256=/);
  });

  it('forwardEvent NU trimite nimic când e dezactivat', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock;

    const fwd = require('../src/services/webhookForwarder');
    fwd.forwardEvent({ id: 'evt_1', type: 'invoice.paid', data: {} });

    await new Promise((r) => setImmediate(r));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
