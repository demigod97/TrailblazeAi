-- Add unit-level reference and metadata to sf_knowledge_chunks
-- Supports detailed chunk tracking, content type classification, and Salesforce-specific tagging

ALTER TABLE sf_knowledge_chunks ADD COLUMN unit_id UUID REFERENCES units(id) ON DELETE CASCADE;
ALTER TABLE sf_knowledge_chunks ADD COLUMN content_type TEXT CHECK (content_type IN ('explanation','code','quiz','hands_on','reference','definition'));
ALTER TABLE sf_knowledge_chunks ADD COLUMN difficulty TEXT CHECK (difficulty IN ('beginner','intermediate','advanced'));
ALTER TABLE sf_knowledge_chunks ADD COLUMN sf_topics TEXT[] DEFAULT '{}';
ALTER TABLE sf_knowledge_chunks ADD COLUMN section_header TEXT;

-- Add concept extraction cache to units (intermediate stage data)
-- Stores the result of identify-concepts stage for use in chunk-content stage
ALTER TABLE units ADD COLUMN sf_concepts JSONB;
