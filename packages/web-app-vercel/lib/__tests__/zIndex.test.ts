import { zIndex } from '../zIndex';

describe('zIndex', () => {
    it('should have header z-index', () => {
        expect(zIndex.header).toBe(10);
    });

    it('should have mobileControls z-index', () => {
        expect(zIndex.mobileControls).toBe(20);
    });

    it('should have desktopControls z-index', () => {
        expect(zIndex.desktopControls).toBe(40);
    });

    it('should have modalBackdrop z-index', () => {
        expect(zIndex.modalBackdrop).toBe(45);
    });

    it('should have modal z-index', () => {
        expect(zIndex.modal).toBe(50);
    });

    it('should have tooltip z-index', () => {
        expect(zIndex.tooltip).toBe(60);
    });

    it('should have correct layering order', () => {
        expect(zIndex.header).toBeLessThan(zIndex.mobileControls);
        expect(zIndex.mobileControls).toBeLessThan(zIndex.desktopControls);
        expect(zIndex.desktopControls).toBeLessThan(zIndex.modalBackdrop);
        expect(zIndex.modalBackdrop).toBeLessThan(zIndex.modal);
        expect(zIndex.modal).toBeLessThan(zIndex.tooltip);
    });
});
