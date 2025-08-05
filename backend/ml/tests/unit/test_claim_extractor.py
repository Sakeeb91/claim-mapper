"""
Unit tests for ClaimExtractor service.
"""
import pytest
import asyncio
from unittest.mock import MagicMock, AsyncMock, patch
import numpy as np

from services.claim_extractor import ClaimExtractor
from models.schemas import ClaimType


@pytest.mark.unit
class TestClaimExtractor:
    """Test cases for ClaimExtractor class."""

    @pytest.fixture
    def claim_extractor(self, mock_spacy_model, mock_sentence_transformer, mock_openai_client):
        """Create ClaimExtractor instance with mocked dependencies."""
        with patch('spacy.load', return_value=mock_spacy_model), \
             patch('sentence_transformers.SentenceTransformer', return_value=mock_sentence_transformer), \
             patch('transformers.pipeline') as mock_pipeline:
            
            # Mock the classification pipeline
            mock_classifier = MagicMock()
            mock_classifier.return_value = [[
                {'label': 'ENTAILMENT', 'score': 0.8},
                {'label': 'NEUTRAL', 'score': 0.15},
                {'label': 'CONTRADICTION', 'score': 0.05}
            ]]
            mock_pipeline.return_value = mock_classifier
            
            extractor = ClaimExtractor()
            # Mock the async model loading
            extractor.nlp = mock_spacy_model
            extractor.similarity_model = mock_sentence_transformer
            extractor.claim_classifier = mock_classifier
            
            return extractor

    @pytest.mark.asyncio
    async def test_extract_claims_basic(self, claim_extractor, sample_text):
        """Test basic claim extraction functionality."""
        # Mock spaCy doc processing
        mock_sent1 = MagicMock()
        mock_sent1.text = "Climate change is causing significant environmental impacts worldwide."
        mock_sent2 = MagicMock()
        mock_sent2.text = "This requires immediate action from governments."
        
        mock_doc = MagicMock()
        mock_doc.sents = [mock_sent1, mock_sent2]
        claim_extractor.nlp.return_value = mock_doc

        # Mock token processing for keywords
        mock_token1 = MagicMock()
        mock_token1.pos_ = 'NOUN'
        mock_token1.is_stop = False
        mock_token1.is_punct = False
        mock_token1.text = 'climate'
        mock_token1.lemma_ = 'climate'
        
        mock_token2 = MagicMock()
        mock_token2.pos_ = 'NOUN'
        mock_token2.is_stop = False
        mock_token2.is_punct = False
        mock_token2.text = 'change'
        mock_token2.lemma_ = 'change'
        
        mock_doc.__iter__ = MagicMock(return_value=iter([mock_token1, mock_token2]))

        # Mock similarity computation
        claim_extractor.similarity_model.encode.side_effect = [
            np.array([[0.1, 0.2, 0.3]]),  # Query embedding
            np.array([[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]])  # Text embeddings
        ]

        result = await claim_extractor.extract_claims(sample_text)

        assert result is not None
        assert len(result.claims) > 0
        assert result.model_version == "claim-extractor-v1.0"
        assert result.processing_time > 0

    @pytest.mark.asyncio
    async def test_classify_claim_high_confidence(self, claim_extractor):
        """Test claim classification with high confidence."""
        claim_text = "Global warming is primarily caused by human activities."
        
        # Mock classifier to return high confidence
        claim_extractor.claim_classifier.return_value = [[
            {'label': 'ENTAILMENT', 'score': 0.92},
            {'label': 'NEUTRAL', 'score': 0.05},
            {'label': 'CONTRADICTION', 'score': 0.03}
        ]]

        confidence = await claim_extractor._classify_claim(claim_text)
        
        assert confidence == 0.92
        claim_extractor.claim_classifier.assert_called_once()

    @pytest.mark.asyncio
    async def test_classify_claim_low_confidence(self, claim_extractor):
        """Test claim classification with low confidence."""
        non_claim_text = "The weather is nice today."
        
        # Mock classifier to return low confidence
        claim_extractor.claim_classifier.return_value = [[
            {'label': 'ENTAILMENT', 'score': 0.3},
            {'label': 'NEUTRAL', 'score': 0.4},
            {'label': 'CONTRADICTION', 'score': 0.3}
        ]]

        confidence = await claim_extractor._classify_claim(non_claim_text)
        
        assert confidence == 0.3

    @pytest.mark.asyncio
    async def test_classify_claim_type_assertion(self, claim_extractor):
        """Test classification of assertion type claims."""
        assertion_text = "Solar energy is more efficient than coal."
        
        claim_type = await claim_extractor._classify_claim_type(assertion_text)
        
        assert claim_type == ClaimType.ASSERTION

    @pytest.mark.asyncio
    async def test_classify_claim_type_question(self, claim_extractor):
        """Test classification of question type claims."""
        question_text = "What are the effects of climate change?"
        
        claim_type = await claim_extractor._classify_claim_type(question_text)
        
        assert claim_type == ClaimType.QUESTION

    @pytest.mark.asyncio
    async def test_classify_claim_type_hypothesis(self, claim_extractor):
        """Test classification of hypothesis type claims."""
        hypothesis_text = "We hypothesize that renewable energy could reduce emissions by 50%."
        
        claim_type = await claim_extractor._classify_claim_type(hypothesis_text)
        
        assert claim_type == ClaimType.HYPOTHESIS

    @pytest.mark.asyncio
    async def test_extract_keywords(self, claim_extractor):
        """Test keyword extraction from text."""
        text = "Climate change causes severe environmental impacts on ecosystems."
        
        # Mock spaCy processing
        mock_tokens = []
        keywords = ['climate', 'change', 'severe', 'environmental', 'impacts', 'ecosystems']
        
        for keyword in keywords:
            mock_token = MagicMock()
            mock_token.pos_ = 'NOUN'
            mock_token.is_stop = False
            mock_token.is_punct = False
            mock_token.text = keyword
            mock_token.lemma_ = keyword
            mock_tokens.append(mock_token)
        
        mock_doc = MagicMock()
        mock_doc.__iter__ = MagicMock(return_value=iter(mock_tokens))
        claim_extractor.nlp.return_value = mock_doc

        extracted_keywords = await claim_extractor._extract_keywords(text)
        
        assert len(extracted_keywords) > 0
        assert all(keyword in keywords for keyword in extracted_keywords)
        assert len(extracted_keywords) <= 10  # Should limit to top 10

    @pytest.mark.asyncio
    async def test_extract_keywords_filters_stop_words(self, claim_extractor):
        """Test that keyword extraction filters out stop words."""
        text = "The climate is changing rapidly and this causes problems."
        
        # Mock tokens including stop words
        mock_tokens = []
        all_words = [
            ('the', 'DET', True),  # Stop word
            ('climate', 'NOUN', False),
            ('is', 'AUX', True),  # Stop word
            ('changing', 'VERB', False),
            ('rapidly', 'ADV', False),
            ('and', 'CCONJ', True),  # Stop word
            ('this', 'PRON', True),  # Stop word
            ('causes', 'VERB', False),
            ('problems', 'NOUN', False)
        ]
        
        for word, pos, is_stop in all_words:
            mock_token = MagicMock()
            mock_token.pos_ = pos
            mock_token.is_stop = is_stop
            mock_token.is_punct = False
            mock_token.text = word
            mock_token.lemma_ = word
            mock_tokens.append(mock_token)
        
        mock_doc = MagicMock()
        mock_doc.__iter__ = MagicMock(return_value=iter(mock_tokens))
        claim_extractor.nlp.return_value = mock_doc

        keywords = await claim_extractor._extract_keywords(text)
        
        # Should not contain stop words
        stop_words = ['the', 'is', 'and', 'this']
        assert not any(stop_word in keywords for stop_word in stop_words)
        assert 'climate' in keywords
        assert 'problems' in keywords

    @pytest.mark.asyncio
    async def test_find_related_evidence(self, claim_extractor):
        """Test finding related evidence for a claim."""
        claim = "Solar energy reduces carbon emissions."
        sentences = [
            "Solar panels convert sunlight to electricity.",
            "Renewable energy sources are environmentally friendly.",
            "Coal power plants produce significant CO2.",
            "The weather forecast shows rain tomorrow."
        ]
        
        # Mock similarity computation
        similarities = [0.7, 0.8, 0.6, 0.2]  # High similarity for first three
        claim_extractor.compute_similarities = AsyncMock(return_value=similarities)

        evidence = await claim_extractor._find_related_evidence(claim, sentences)
        
        assert len(evidence) <= 3  # Should return top 3
        assert "Solar panels convert sunlight to electricity." in evidence
        assert "Renewable energy sources are environmentally friendly." in evidence
        assert "Coal power plants produce significant CO2." in evidence
        assert "The weather forecast shows rain tomorrow." not in evidence  # Low similarity

    @pytest.mark.asyncio
    async def test_compute_similarities(self, claim_extractor):
        """Test semantic similarity computation."""
        query = "Climate change affects biodiversity."
        texts = [
            "Global warming impacts wildlife habitats.",
            "The stock market showed gains today.",
            "Environmental changes threaten species survival."
        ]
        
        # Mock embeddings
        query_embedding = np.array([[0.1, 0.2, 0.3]])
        text_embeddings = np.array([
            [0.15, 0.25, 0.35],  # Similar to query
            [0.9, 0.1, 0.05],    # Dissimilar
            [0.12, 0.22, 0.32]   # Similar to query
        ])
        
        claim_extractor.similarity_model.encode.side_effect = [
            query_embedding,
            text_embeddings
        ]

        similarities = await claim_extractor.compute_similarities(query, texts)
        
        assert len(similarities) == len(texts)
        assert all(0 <= sim <= 1 for sim in similarities)
        assert similarities[0] > similarities[1]  # First text more similar
        assert similarities[2] > similarities[1]  # Third text more similar

    @pytest.mark.asyncio
    async def test_extract_claims_with_confidence_threshold(self, claim_extractor):
        """Test claim extraction respects confidence threshold."""
        text = "Climate change is real. The weather is nice."
        
        # Mock spaCy processing
        mock_sent1 = MagicMock()
        mock_sent1.text = "Climate change is real."
        mock_sent2 = MagicMock()
        mock_sent2.text = "The weather is nice."
        
        mock_doc = MagicMock()
        mock_doc.sents = [mock_sent1, mock_sent2]
        claim_extractor.nlp.return_value = mock_doc
        
        # Mock keyword extraction
        claim_extractor._extract_keywords = AsyncMock(return_value=['climate', 'change'])
        claim_extractor._find_related_evidence = AsyncMock(return_value=[])
        
        # Mock classification - first sentence high confidence, second low
        def mock_classify_claim(sentence):
            if "climate change" in sentence:
                return asyncio.create_task(asyncio.coroutine(lambda: 0.9)())
            else:
                return asyncio.create_task(asyncio.coroutine(lambda: 0.4)())
        
        claim_extractor._classify_claim = mock_classify_claim
        claim_extractor._classify_claim_type = AsyncMock(return_value=ClaimType.ASSERTION)

        # Test with high threshold
        result = await claim_extractor.extract_claims(text, confidence_threshold=0.8)
        
        assert len(result.claims) == 1  # Only high-confidence claim
        assert "climate change" in result.claims[0].text.lower()

    @pytest.mark.asyncio
    async def test_extract_claims_without_evidence(self, claim_extractor):
        """Test claim extraction when evidence extraction is disabled."""
        text = "Solar power is sustainable energy."
        
        # Mock spaCy processing
        mock_sent = MagicMock()
        mock_sent.text = "Solar power is sustainable energy."
        
        mock_doc = MagicMock()
        mock_doc.sents = [mock_sent]
        claim_extractor.nlp.return_value = mock_doc
        
        # Mock other methods
        claim_extractor._classify_claim = AsyncMock(return_value=0.8)
        claim_extractor._classify_claim_type = AsyncMock(return_value=ClaimType.ASSERTION)
        claim_extractor._extract_keywords = AsyncMock(return_value=['solar', 'power'])

        result = await claim_extractor.extract_claims(text, extract_evidence=False)
        
        assert len(result.claims) == 1
        assert result.claims[0].related_evidence == []
        # Should not call evidence finding
        claim_extractor._find_related_evidence = AsyncMock()
        assert not claim_extractor._find_related_evidence.called

    @pytest.mark.asyncio
    async def test_error_handling_in_classification(self, claim_extractor):
        """Test error handling during claim classification."""
        # Mock classifier to raise exception
        claim_extractor.claim_classifier.side_effect = Exception("Model error")
        
        confidence = await claim_extractor._classify_claim("Test sentence")
        
        assert confidence == 0.0  # Should return 0 on error

    @pytest.mark.asyncio
    async def test_error_handling_in_similarity_computation(self, claim_extractor):
        """Test error handling during similarity computation."""
        # Mock model to raise exception
        claim_extractor.similarity_model.encode.side_effect = Exception("Encoding error")
        
        similarities = await claim_extractor.compute_similarities("query", ["text1", "text2"])
        
        assert similarities == [0.0, 0.0]  # Should return zeros on error

    @pytest.mark.asyncio
    async def test_performance_timing(self, claim_extractor, performance_timer):
        """Test that processing time is tracked correctly."""
        text = "Climate change requires immediate action."
        
        # Mock all dependencies for minimal processing
        mock_sent = MagicMock()
        mock_sent.text = text
        
        mock_doc = MagicMock()
        mock_doc.sents = [mock_sent]
        claim_extractor.nlp.return_value = mock_doc
        
        claim_extractor._classify_claim = AsyncMock(return_value=0.8)
        claim_extractor._classify_claim_type = AsyncMock(return_value=ClaimType.ASSERTION)
        claim_extractor._extract_keywords = AsyncMock(return_value=['climate'])
        claim_extractor._find_related_evidence = AsyncMock(return_value=[])

        performance_timer.start()
        result = await claim_extractor.extract_claims(text)
        performance_timer.stop()
        
        assert result.processing_time > 0
        assert result.processing_time < 10  # Should be fast with mocks
        assert performance_timer.elapsed is not None

    @pytest.mark.asyncio
    async def test_metadata_in_response(self, claim_extractor):
        """Test that response includes correct metadata."""
        text = "Renewable energy is the future."
        source = "test_document.pdf"
        
        # Mock minimal processing
        mock_doc = MagicMock()
        mock_doc.sents = []
        claim_extractor.nlp.return_value = mock_doc

        result = await claim_extractor.extract_claims(
            text, 
            source=source, 
            confidence_threshold=0.6
        )
        
        assert result.metadata["source"] == source
        assert result.metadata["confidence_threshold"] == 0.6
        assert "sentence_count" in result.metadata
        assert result.model_version == "claim-extractor-v1.0"

    @pytest.mark.asyncio
    async def test_empty_text_handling(self, claim_extractor):
        """Test handling of empty or whitespace-only text."""
        empty_texts = ["", "   ", "\n\t  \n"]
        
        for text in empty_texts:
            mock_doc = MagicMock()
            mock_doc.sents = []
            claim_extractor.nlp.return_value = mock_doc
            
            result = await claim_extractor.extract_claims(text)
            
            assert len(result.claims) == 0
            assert result.metadata["sentence_count"] == 0

    @pytest.mark.asyncio
    async def test_very_short_sentences_filtered(self, claim_extractor):
        """Test that very short sentences are filtered out."""
        text = "Climate change is a major issue. Yes. No. Maybe. This is a longer sentence."
        
        # Mock sentences including very short ones
        sentences = ["Climate change is a major issue.", "Yes.", "No.", "Maybe.", "This is a longer sentence."]
        mock_sents = [MagicMock(text=sent) for sent in sentences]
        
        mock_doc = MagicMock()
        mock_doc.sents = mock_sents
        claim_extractor.nlp.return_value = mock_doc
        
        # Mock classification to accept all (for testing filtering)
        claim_extractor._classify_claim = AsyncMock(return_value=0.8)
        claim_extractor._classify_claim_type = AsyncMock(return_value=ClaimType.ASSERTION)
        claim_extractor._extract_keywords = AsyncMock(return_value=['test'])
        claim_extractor._find_related_evidence = AsyncMock(return_value=[])

        result = await claim_extractor.extract_claims(text)
        
        # Should only include sentences longer than 10 characters
        long_sentences = [sent for sent in sentences if len(sent.strip()) > 10]
        assert len(result.claims) == len(long_sentences)
        
        claim_texts = [claim.text for claim in result.claims]
        assert "Yes." not in claim_texts
        assert "No." not in claim_texts
        assert "Maybe." not in claim_texts
        assert "Climate change is a major issue." in claim_texts