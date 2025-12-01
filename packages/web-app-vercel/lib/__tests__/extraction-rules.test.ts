import { ExtractionRulesManager, extractionRulesManager, ExtractionRule } from '../extraction-rules';

describe('ExtractionRulesManager', () => {
    let manager: ExtractionRulesManager;

    beforeEach(() => {
        manager = new ExtractionRulesManager();
    });

    describe('getRule', () => {
        it('should return null for URL with no registered rule', () => {
            const result = manager.getRule('https://example.com/article');
            expect(result).toBeNull();
        });

        it('should return null for invalid URL', () => {
            const result = manager.getRule('not-a-valid-url');
            expect(result).toBeNull();
        });

        it('should return registered rule for matching domain', () => {
            const rule: ExtractionRule = {
                domain: 'example.com',
                name: 'Example Site',
                description: 'Example extraction rule',
            };
            manager.registerRule(rule);

            const result = manager.getRule('https://example.com/article');
            expect(result).toEqual(rule);
        });

        it('should strip www from domain when matching', () => {
            const rule: ExtractionRule = {
                domain: 'example.com',
                name: 'Example Site',
                description: 'Example extraction rule',
            };
            manager.registerRule(rule);

            const result = manager.getRule('https://www.example.com/article');
            expect(result).toEqual(rule);
        });
    });

    describe('registerRule', () => {
        it('should register a rule', () => {
            const rule: ExtractionRule = {
                domain: 'test.com',
                name: 'Test Site',
                description: 'Test extraction rule',
            };
            manager.registerRule(rule);

            expect(manager.getRule('https://test.com/page')).toEqual(rule);
        });

        it('should override existing rule for same domain', () => {
            const rule1: ExtractionRule = {
                domain: 'test.com',
                name: 'Original Rule',
                description: 'Original description',
            };
            const rule2: ExtractionRule = {
                domain: 'test.com',
                name: 'Updated Rule',
                description: 'Updated description',
            };

            manager.registerRule(rule1);
            manager.registerRule(rule2);

            expect(manager.getRule('https://test.com/page')?.name).toBe('Updated Rule');
        });

        it('should register rule with selectors', () => {
            const rule: ExtractionRule = {
                domain: 'blog.com',
                name: 'Blog Site',
                description: 'Blog extraction rule',
                selectors: {
                    title: 'h1.post-title',
                    content: 'article.post-content',
                    author: '.author-name',
                    publishDate: 'time.published',
                },
            };
            manager.registerRule(rule);

            const result = manager.getRule('https://blog.com/post/123');
            expect(result?.selectors?.title).toBe('h1.post-title');
            expect(result?.selectors?.content).toBe('article.post-content');
        });
    });

    describe('getAllRules', () => {
        it('should return empty object when no rules registered', () => {
            const rules = manager.getAllRules();
            expect(rules).toEqual({});
        });

        it('should return all registered rules', () => {
            const rule1: ExtractionRule = {
                domain: 'site1.com',
                name: 'Site 1',
                description: 'Site 1 rule',
            };
            const rule2: ExtractionRule = {
                domain: 'site2.com',
                name: 'Site 2',
                description: 'Site 2 rule',
            };

            manager.registerRule(rule1);
            manager.registerRule(rule2);

            const rules = manager.getAllRules();
            expect(Object.keys(rules)).toHaveLength(2);
            expect(rules['site1.com']).toEqual(rule1);
            expect(rules['site2.com']).toEqual(rule2);
        });

        it('should return a copy of rules', () => {
            const rule: ExtractionRule = {
                domain: 'test.com',
                name: 'Test',
                description: 'Test rule',
            };
            manager.registerRule(rule);

            const rules = manager.getAllRules();
            rules['test.com'] = {
                domain: 'modified.com',
                name: 'Modified',
                description: 'Modified rule',
            };

            const originalRules = manager.getAllRules();
            expect(originalRules['test.com'].name).toBe('Test');
        });
    });
});

describe('extractionRulesManager', () => {
    it('should be a global instance of ExtractionRulesManager', () => {
        expect(extractionRulesManager).toBeInstanceOf(ExtractionRulesManager);
    });
});
