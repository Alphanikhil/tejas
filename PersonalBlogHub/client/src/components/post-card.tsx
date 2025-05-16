import { Link } from 'wouter';
import { Post } from '@shared/schema';
import { formatDate, calculateReadingTime, getImageUrl } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

interface PostCardProps {
  post: Post;
}

const PostCard = ({ post }: PostCardProps) => {
  return (
    <article className="bg-white rounded-lg shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
      <img 
        src={getImageUrl(post.featuredImage)} 
        alt={post.title} 
        className="w-full h-48 object-cover"
      />
      <div className="p-6">
        <h3 className="text-xl font-semibold mb-2">{post.title}</h3>
        <p className="text-gray-600 mb-4 line-clamp-3">{post.excerpt}</p>
        <div className="flex items-center text-sm text-gray-500">
          <span>{formatDate(post.createdAt)}</span>
          <span className="mx-2">•</span>
          <span>{calculateReadingTime(JSON.stringify(post.content))}</span>
        </div>
        <Link 
          href={`/post/${post.slug}`} 
          className="mt-4 text-primary hover:text-primary/80 font-medium flex items-center group"
        >
          Read more 
          <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </article>
  );
};

export default PostCard;
