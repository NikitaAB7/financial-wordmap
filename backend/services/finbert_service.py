"""
FinBERT Sentiment Analysis Service

Uses ProsusAI/finbert model for financial sentiment classification.
This is a BERT model fine-tuned on financial texts.
"""

from typing import Literal, List, Tuple
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.schemas import SentimentType

# Lazy load to avoid slow startup
_model = None
_tokenizer = None
_device = None


def _load_model():
    """Lazy load FinBERT model and tokenizer"""
    global _model, _tokenizer, _device
    
    if _model is not None:
        return _model, _tokenizer, _device
    
    try:
        import torch
        from transformers import AutoTokenizer, AutoModelForSequenceClassification
        
        print("Loading FinBERT model...")
        
        # Use GPU if available
        _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"  Using device: {_device}")
        
        # Load ProsusAI/finbert - fine-tuned for financial sentiment
        model_name = "ProsusAI/finbert"
        _tokenizer = AutoTokenizer.from_pretrained(model_name)
        _model = AutoModelForSequenceClassification.from_pretrained(model_name)
        _model.to(_device)
        _model.eval()  # Set to evaluation mode
        
        print("✓ FinBERT model loaded successfully")
        return _model, _tokenizer, _device
        
    except ImportError as e:
        print(f"✗ FinBERT dependencies not installed: {e}")
        print("  Run: pip install transformers torch")
        return None, None, None
    except Exception as e:
        print(f"✗ Failed to load FinBERT model: {e}")
        return None, None, None


class FinBERTService:
    """Service for financial sentiment analysis using FinBERT"""
    
    def __init__(self):
        self._initialized = False
        
    def _ensure_loaded(self) -> bool:
        """Ensure model is loaded, return True if successful"""
        if self._initialized:
            return _model is not None
        
        self._initialized = True
        _load_model()
        return _model is not None
    
    def is_available(self) -> bool:
        """Check if FinBERT is available and loaded"""
        return self._ensure_loaded()
    
    def analyze_sentiment(self, text: str) -> SentimentType:
        """
        Analyze sentiment of financial text using FinBERT.
        
        Args:
            text: Text to analyze (headline, article content, etc.)
            
        Returns:
            SentimentType: "positive", "negative", or "neutral"
        """
        if not self._ensure_loaded():
            # Fallback to rule-based if model unavailable
            return self._fallback_sentiment(text)
        
        try:
            import torch
            
            # Truncate text to model's max length (512 tokens)
            # Use first 450 chars to be safe with tokenization
            text = text[:450] if len(text) > 450 else text
            
            # Tokenize
            inputs = _tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                max_length=512,
                padding=True
            )
            inputs = {k: v.to(_device) for k, v in inputs.items()}
            
            # Get prediction
            with torch.no_grad():
                outputs = _model(**inputs)
                predictions = torch.nn.functional.softmax(outputs.logits, dim=-1)
                predicted_class = torch.argmax(predictions, dim=-1).item()
            
            # FinBERT labels: 0=positive, 1=negative, 2=neutral
            label_map = {0: "positive", 1: "negative", 2: "neutral"}
            return label_map[predicted_class]
            
        except Exception as e:
            print(f"FinBERT inference error: {e}")
            return self._fallback_sentiment(text)
    
    def analyze_sentiment_with_score(self, text: str) -> Tuple[SentimentType, float]:
        """
        Analyze sentiment and return confidence score.
        
        Returns:
            Tuple of (sentiment, confidence_score)
        """
        if not self._ensure_loaded():
            sentiment = self._fallback_sentiment(text)
            return sentiment, 0.5  # Low confidence for fallback
        
        try:
            import torch
            
            text = text[:450] if len(text) > 450 else text
            
            inputs = _tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                max_length=512,
                padding=True
            )
            inputs = {k: v.to(_device) for k, v in inputs.items()}
            
            with torch.no_grad():
                outputs = _model(**inputs)
                probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
                predicted_class = torch.argmax(probs, dim=-1).item()
                confidence = probs[0][predicted_class].item()
            
            label_map = {0: "positive", 1: "negative", 2: "neutral"}
            return label_map[predicted_class], confidence
            
        except Exception as e:
            print(f"FinBERT inference error: {e}")
            sentiment = self._fallback_sentiment(text)
            return sentiment, 0.5
    
    def analyze_batch(self, texts: List[str]) -> List[SentimentType]:
        """
        Analyze sentiment for multiple texts in batch (more efficient).
        
        Args:
            texts: List of texts to analyze
            
        Returns:
            List of sentiment labels
        """
        if not self._ensure_loaded() or not texts:
            return [self._fallback_sentiment(t) for t in texts]
        
        try:
            import torch
            
            # Truncate all texts
            texts = [t[:450] if len(t) > 450 else t for t in texts]
            
            # Batch tokenize
            inputs = _tokenizer(
                texts,
                return_tensors="pt",
                truncation=True,
                max_length=512,
                padding=True
            )
            inputs = {k: v.to(_device) for k, v in inputs.items()}
            
            # Batch inference
            with torch.no_grad():
                outputs = _model(**inputs)
                predictions = torch.nn.functional.softmax(outputs.logits, dim=-1)
                predicted_classes = torch.argmax(predictions, dim=-1).tolist()
            
            label_map = {0: "positive", 1: "negative", 2: "neutral"}
            return [label_map[c] for c in predicted_classes]
            
        except Exception as e:
            print(f"FinBERT batch inference error: {e}")
            return [self._fallback_sentiment(t) for t in texts]
    
    def _fallback_sentiment(self, text: str) -> SentimentType:
        """
        Simple rule-based fallback when FinBERT is unavailable.
        """
        text_lower = text.lower()
        
        positive_words = [
            "rise", "gain", "up", "surge", "rally", "growth", "profit",
            "bullish", "outperform", "upgrade", "strong", "positive",
            "beat", "exceed", "record", "high", "boost", "optimistic"
        ]
        negative_words = [
            "fall", "drop", "down", "decline", "loss", "crash", "plunge",
            "bearish", "underperform", "downgrade", "weak", "negative",
            "miss", "concern", "risk", "low", "cut", "pessimistic", "warning"
        ]
        
        pos_count = sum(1 for word in positive_words if word in text_lower)
        neg_count = sum(1 for word in negative_words if word in text_lower)
        
        if pos_count > neg_count + 1:
            return "positive"
        elif neg_count > pos_count + 1:
            return "negative"
        return "neutral"


# Singleton instance
finbert_service = FinBERTService()
